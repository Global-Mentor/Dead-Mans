using backend.Application.Abstractions;
using backend.Application.Abstractions.Auth;
using backend.Application.Abstractions.Realtime;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Application.Realtime;
using backend.Domain.Persistence;
using backend.Messaging;

namespace backend.Application.Features.GameQuestions;

public sealed class GameQuizService : IGameQuizService
{
    private readonly IGameQuizRepository _repository;
    private readonly IGameBoardEventsPublisher _eventsPublisher;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<GameQuizService> _logger;

    public GameQuizService(
        IGameQuizRepository repository,
        IGameBoardEventsPublisher eventsPublisher,
        TimeProvider timeProvider,
        ILogger<GameQuizService> logger
    )
    {
        _repository = repository;
        _eventsPublisher = eventsPublisher;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public Task<IReadOnlyList<AvailableGameQuizQuestion>> GetAvailableQuizQuestionsAsync(
        CancellationToken cancellationToken = default
    ) => _repository.GetAvailableQuizQuestionsAsync(cancellationToken);

    public async Task<AskGameQuizQuestionResult> AskQuizQuestionAsync(
        Guid? questionId,
        GameQuizQuestionDelivery delivery,
        CancellationToken cancellationToken = default
    )
    {
        if (!IsValidDelivery(delivery))
        {
            return new AskGameQuizQuestionResult(AskGameQuizQuestionOutcome.InvalidDelivery);
        }

        await CloseExpiredQuizQuestionSessionsAsync(cancellationToken);

        var activeGameId = await _repository.GetActiveGameIdAsync(cancellationToken);
        if (!activeGameId.HasValue)
        {
            return new AskGameQuizQuestionResult(AskGameQuizQuestionOutcome.NoActiveGame);
        }

        var askedQuestion = await _repository.AskQuizQuestionAsync(
            activeGameId.Value,
            questionId,
            delivery,
            cancellationToken
        );
        if (askedQuestion is null)
        {
            return new AskGameQuizQuestionResult(AskGameQuizQuestionOutcome.NoAvailableQuestions);
        }

        await PublishQuizStateChangedBestEffortAsync(
            askedQuestion.GameId,
            GameQuizStateChangeKinds.QuestionAsked,
            askedQuestion.AskedAtUtc
        );

        return new AskGameQuizQuestionResult(AskGameQuizQuestionOutcome.Asked, askedQuestion);
    }

    public async Task<SubmitGameQuizAnswerResult> SubmitQuizAnswerAsync(
        Guid questionSessionId,
        SubmitGameQuizAnswerInput input,
        CancellationToken cancellationToken = default
    )
    {
        if (input.SelectedOptionId == Guid.Empty)
        {
            return new SubmitGameQuizAnswerResult(SubmitGameQuizAnswerOutcome.InvalidRequest);
        }
        if (!IsValidAnswerSource(input.Source))
        {
            return new SubmitGameQuizAnswerResult(SubmitGameQuizAnswerOutcome.InvalidSource);
        }

        var submission = await _repository.SubmitQuizAnswerAsync(
            questionSessionId,
            input,
            cancellationToken
        );
        if (submission.ClosedGameId.HasValue)
        {
            await PublishQuizStateChangedBestEffortAsync(
                submission.ClosedGameId.Value,
                GameQuizStateChangeKinds.QuestionClosed,
                _timeProvider.GetUtcNow().UtcDateTime
            );
        }
        var outcome = submission.Outcome switch
        {
            SubmitQuizAnswerRepositoryOutcome.Accepted => SubmitGameQuizAnswerOutcome.Accepted,
            SubmitQuizAnswerRepositoryOutcome.Existing => SubmitGameQuizAnswerOutcome.Existing,
            SubmitQuizAnswerRepositoryOutcome.AlreadyAnswered => SubmitGameQuizAnswerOutcome.AlreadyAnswered,
            SubmitQuizAnswerRepositoryOutcome.QuestionSessionNotFound => SubmitGameQuizAnswerOutcome.QuestionSessionNotFound,
            SubmitQuizAnswerRepositoryOutcome.QuestionSessionClosed => SubmitGameQuizAnswerOutcome.QuestionSessionClosed,
            SubmitQuizAnswerRepositoryOutcome.OptionNotFound => SubmitGameQuizAnswerOutcome.OptionNotFound,
            SubmitQuizAnswerRepositoryOutcome.PlayerNotFound => SubmitGameQuizAnswerOutcome.PlayerNotFound,
            _ => SubmitGameQuizAnswerOutcome.InvalidRequest
        };
        return new SubmitGameQuizAnswerResult(outcome, submission.Receipt);
    }

    public async Task<CurrentGameQuizState?> GetCurrentQuizStateAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        await CloseExpiredQuizQuestionSessionsAsync(cancellationToken);
        return await _repository.GetCurrentQuizStateAsync(userId, cancellationToken);
    }

    public async Task<int> CloseExpiredQuizQuestionSessionsAsync(
        CancellationToken cancellationToken = default
    )
    {
        var result = await _repository.CloseExpiredQuizQuestionSessionsAsync(cancellationToken);
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        foreach (var gameId in result.ClosedGameIds)
        {
            await PublishQuizStateChangedBestEffortAsync(
                gameId,
                GameQuizStateChangeKinds.QuestionClosed,
                now
            );
        }
        return result.ClosedQuizQuestionCount;
    }

    public async Task<ManualQuizAwardResult> AwardManualQuizPointsAsync(
        ManualQuizAwardInput input,
        Guid awardedByUserId,
        CancellationToken cancellationToken = default
    )
    {
        if (input.Points <= 0)
        {
            return new ManualQuizAwardResult(ManualQuizAwardOutcome.InvalidPoints);
        }
        if (!GameQuizManualAdjustmentOperationValue.All.Contains(input.OperationType))
        {
            return new ManualQuizAwardResult(ManualQuizAwardOutcome.InvalidOperation);
        }
        if (string.IsNullOrWhiteSpace(input.Reason) || input.Reason.Trim().Length is < 3 or > 500)
        {
            return new ManualQuizAwardResult(ManualQuizAwardOutcome.InvalidReason);
        }

        var result = await _repository.AwardManualQuizPointsAsync(
            input,
            awardedByUserId,
            cancellationToken
        );

        if (result.Outcome == ManualQuizAwardOutcome.Awarded
            && result.Award is not null
            && result.StateChanged)
        {
            await PublishQuizStateChangedBestEffortAsync(
                result.Award.GameId,
                GameQuizStateChangeKinds.ManualAdjustmentApplied,
                result.Award.AwardedAtUtc
            );
        }

        return result;
    }

    public Task<IReadOnlyList<ManualQuizAwardPlayer>> GetManualQuizAwardPlayersAsync(
        CancellationToken cancellationToken = default
    )
    {
        return _repository.GetManualQuizAwardPlayersAsync(cancellationToken);
    }

    private Task PublishQuizStateChangedBestEffortAsync(
        Guid gameId,
        string changeKind,
        DateTime occurredAtUtc
    )
    {
        return RealtimePublishGuard.TryPublishAsync(
            publishToken => _eventsPublisher.PublishQuizStateChangedAsync(
                new GameQuizStateChangedEvent(gameId, changeKind, occurredAtUtc),
                publishToken
            ),
            _logger,
            AppMessages.Logs.RealtimeGameQuizStateChangedPublishFailed,
            gameId,
            changeKind
        );
    }

    private static bool IsValidDelivery(GameQuizQuestionDelivery delivery)
    {
        return delivery switch
        {
            ManualGameQuizQuestionDelivery manual => manual.AskedByUserId != Guid.Empty,
            TwitchGameQuizQuestionDelivery twitch =>
                HasRequiredValue(twitch.SourceChannelId, 128)
                && HasValidOptionalValue(twitch.SourceMessageId, 128),
            _ => false
        };
    }

    private static bool IsValidAnswerSource(GameQuizAnswerSource source)
    {
        return source switch
        {
            ManualGameQuizAnswerSource manual =>
                manual.CapturedByUserId != Guid.Empty
                && manual.AwardedToUserId != Guid.Empty
                && HasValidOptionalValue(manual.ReportedDisplayName, 128),
            TwitchGameQuizAnswerSource twitch =>
                TwitchIdentityValidator.IsValid(
                    twitch.TwitchUserId,
                    twitch.Login,
                    twitch.DisplayName
                )
                && HasRequiredValue(twitch.SourceChannelId, 128)
                && HasRequiredValue(twitch.SourceMessageId, 128),
            WebGameQuizAnswerSource web => web.UserId != Guid.Empty,
            _ => false
        };
    }

    private static bool HasRequiredValue(string? value, int maximumLength)
    {
        return !string.IsNullOrWhiteSpace(value) && value.Length <= maximumLength;
    }

    private static bool HasValidOptionalValue(string? value, int maximumLength)
    {
        return value is null || (!string.IsNullOrWhiteSpace(value) && value.Length <= maximumLength);
    }
}
