using backend.Api.Contracts;
using backend.Api.Http;
using backend.Api.Mapping;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Auth;
using backend.Application.Contracts;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/game/quiz")]
[Authorize]
public sealed class GameQuizController : ControllerBase
{
    private readonly IGameQuizService _gameQuizService;
    private readonly ITwitchBotService? _twitchBot;

    public GameQuizController(
        IGameQuizService gameQuizService,
        ITwitchBotService? twitchBot = null)
    {
        _gameQuizService = gameQuizService;
        _twitchBot = twitchBot;
    }

    [HttpGet("questions/available")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    [ProducesResponseType(typeof(IReadOnlyList<AvailableGameQuizQuestionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAvailableQuestions(CancellationToken cancellationToken)
    {
        var questions = await _gameQuizService.GetAvailableQuizQuestionsAsync(cancellationToken);
        return Ok(questions.Select(question => question.ToDto()).ToArray());
    }

    [HttpPost("questions/ask-next")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    [ProducesResponseType(typeof(AskedQuizQuestionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> AskNextQuestion(CancellationToken cancellationToken)
    {
        if (_twitchBot?.IsEnabled == true)
            return MapTwitchPreparation(await _twitchBot.PrepareQuestionAsync(null, cancellationToken));
        var askedByUserId = HttpContext.TryGetUserId();
        if (!askedByUserId.HasValue)
        {
            return this.BadRequestError(AppMessages.Client.AuthCookieMissingClaims);
        }

        var result = await _gameQuizService.AskQuizQuestionAsync(
            null,
            new ManualGameQuizQuestionDelivery(askedByUserId.Value),
            cancellationToken
        );
        return result.Outcome switch
        {
            AskGameQuizQuestionOutcome.Asked when result.AskedQuestion is not null =>
                Ok(result.AskedQuestion.ToDto()),
            AskGameQuizQuestionOutcome.NoActiveGame => this.NotFoundError(
                AppMessages.Client.GameQuizNoActiveGame,
                AppMessages.ErrorCodes.GameQuizNoActiveGame
            ),
            AskGameQuizQuestionOutcome.NoAvailableQuestions => this.NotFoundError(
                AppMessages.Client.GameQuizNoAvailableQuestions,
                AppMessages.ErrorCodes.GameQuizNoAvailableQuestions
            ),
            AskGameQuizQuestionOutcome.ModifierOrderingActive => this.ConflictError(
                AppMessages.Client.GameQuizModifierOrderingActive,
                AppMessages.ErrorCodes.GameQuizModifierOrderingActive
            ),
            _ => this.StatusError(
                StatusCodes.Status500InternalServerError,
                AppMessages.Client.UnexpectedServerError
            )
        };
    }

    [HttpPost("questions/{questionId:guid}/ask")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    [ProducesResponseType(typeof(AskedQuizQuestionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AskQuestion(Guid questionId, CancellationToken cancellationToken)
    {
        if (_twitchBot?.IsEnabled == true)
            return MapTwitchPreparation(await _twitchBot.PrepareQuestionAsync(questionId, cancellationToken));
        var askedByUserId = HttpContext.TryGetUserId();
        if (!askedByUserId.HasValue)
        {
            return this.BadRequestError(AppMessages.Client.AuthCookieMissingClaims);
        }

        var result = await _gameQuizService.AskQuizQuestionAsync(
            questionId,
            new ManualGameQuizQuestionDelivery(askedByUserId.Value),
            cancellationToken
        );
        return result.Outcome switch
        {
            AskGameQuizQuestionOutcome.Asked when result.AskedQuestion is not null =>
                Ok(result.AskedQuestion.ToDto()),
            AskGameQuizQuestionOutcome.NoActiveGame => this.NotFoundError(
                AppMessages.Client.GameQuizNoActiveGame,
                AppMessages.ErrorCodes.GameQuizNoActiveGame
            ),
            AskGameQuizQuestionOutcome.NoAvailableQuestions => this.NotFoundError(
                AppMessages.Client.GameQuizNoAvailableQuestions,
                AppMessages.ErrorCodes.GameQuizNoAvailableQuestions
            ),
            AskGameQuizQuestionOutcome.ModifierOrderingActive => this.ConflictError(
                AppMessages.Client.GameQuizModifierOrderingActive,
                AppMessages.ErrorCodes.GameQuizModifierOrderingActive
            ),
            _ => this.StatusError(StatusCodes.Status500InternalServerError, AppMessages.Client.UnexpectedServerError)
        };
    }

    private IActionResult MapTwitchPreparation(PrepareTwitchQuizQuestionResult result) => result.Outcome switch
    {
        PrepareTwitchQuizQuestionOutcome.Prepared => Accepted(result),
        PrepareTwitchQuizQuestionOutcome.PublicationInProgress or PrepareTwitchQuizQuestionOutcome.PendingOutcome or PrepareTwitchQuizQuestionOutcome.ModifierOrderingActive =>
            this.ConflictError(TwitchBotController.GetPreparationMessage(result.Outcome), TwitchBotController.GetPreparationCode(result.Outcome)),
        PrepareTwitchQuizQuestionOutcome.NoActiveGame or PrepareTwitchQuizQuestionOutcome.NoAvailableQuestions =>
            this.NotFoundError(TwitchBotController.GetPreparationMessage(result.Outcome), TwitchBotController.GetPreparationCode(result.Outcome)),
        _ => this.BadRequestError(TwitchBotController.GetPreparationMessage(result.Outcome), result.ErrorCode ?? TwitchBotController.GetPreparationCode(result.Outcome))
    };

    [HttpGet("current")]
    [ProducesResponseType(typeof(CurrentGameQuizStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> GetCurrent(CancellationToken cancellationToken)
    {
        var userId = HttpContext.TryGetUserId();
        if (!userId.HasValue)
        {
            return this.BadRequestError(AppMessages.Client.AuthCookieMissingClaims);
        }

        var state = await _gameQuizService.GetCurrentQuizStateAsync(userId.Value, cancellationToken);
        return state is null ? NoContent() : Ok(state.ToDto());
    }

    [HttpPost("question-sessions/{questionSessionId:guid}/submissions")]
    [ProducesResponseType(typeof(GameQuizSubmissionReceiptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> SubmitAnswer(
        Guid questionSessionId,
        [FromBody] SubmitGameQuizAnswerRequestDto? request,
        CancellationToken cancellationToken
    )
    {
        if (request is null || !Guid.TryParse(request.OptionId, out var optionId))
        {
            return this.BadRequestError(
                AppMessages.Client.GameQuestionInvalidRequest,
                AppMessages.ErrorCodes.GameQuestionInvalidRequest
            );
        }

        var userId = HttpContext.TryGetUserId();
        if (!userId.HasValue)
        {
            return this.BadRequestError(AppMessages.Client.AuthCookieMissingClaims);
        }

        var result = await _gameQuizService.SubmitQuizAnswerAsync(
            questionSessionId,
            new SubmitGameQuizAnswerInput(optionId, new WebGameQuizAnswerSource(userId.Value)),
            cancellationToken
        );

        return result.Outcome switch
        {
            SubmitGameQuizAnswerOutcome.Accepted when result.Receipt is not null => Ok(result.Receipt.ToDto()),
            SubmitGameQuizAnswerOutcome.Existing when result.Receipt is not null => Ok(result.Receipt.ToDto()),
            SubmitGameQuizAnswerOutcome.InvalidRequest => this.BadRequestError(
                AppMessages.Client.GameQuestionInvalidRequest,
                AppMessages.ErrorCodes.GameQuestionInvalidRequest
            ),
            SubmitGameQuizAnswerOutcome.InvalidSource => this.BadRequestError(
                AppMessages.Client.GameQuestionInvalidRequest,
                AppMessages.ErrorCodes.GameQuestionInvalidRequest
            ),
            SubmitGameQuizAnswerOutcome.QuestionSessionNotFound => this.NotFoundError(
                AppMessages.Client.GameQuizQuestionSessionNotFound,
                AppMessages.ErrorCodes.GameQuizQuestionSessionNotFound
            ),
            SubmitGameQuizAnswerOutcome.PlayerNotFound => this.NotFoundError(
                AppMessages.Client.GameQuizAnswerPlayerNotFound,
                AppMessages.ErrorCodes.GameQuizAnswerPlayerNotFound
            ),
            SubmitGameQuizAnswerOutcome.OptionNotFound => this.NotFoundError(
                AppMessages.Client.GameQuizOptionNotFound,
                AppMessages.ErrorCodes.GameQuizOptionNotFound
            ),
            SubmitGameQuizAnswerOutcome.QuestionSessionClosed => this.ConflictError(
                AppMessages.Client.GameQuizQuestionSessionClosed,
                AppMessages.ErrorCodes.GameQuizQuestionSessionClosed
            ),
            SubmitGameQuizAnswerOutcome.AlreadyAnswered => this.ConflictError(
                AppMessages.Client.GameQuizAlreadyAnswered,
                AppMessages.ErrorCodes.GameQuizAlreadyAnswered
            ),
            _ => this.StatusError(
                StatusCodes.Status500InternalServerError,
                AppMessages.Client.UnexpectedServerError
            )
        };
    }

    [HttpGet("manual-awards/players")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    [ProducesResponseType(typeof(IReadOnlyList<ManualQuizAwardPlayerDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetManualAwardPlayers(CancellationToken cancellationToken)
    {
        var players = await _gameQuizService.GetManualQuizAwardPlayersAsync(cancellationToken);
        return Ok(players.Select(player => player.ToDto()).ToArray());
    }

    [HttpPost("manual-awards")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    [ProducesResponseType(typeof(ManualQuizAwardSummaryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> AwardManualPoints(
        [FromBody] ManualQuizAwardRequestDto? request,
        CancellationToken cancellationToken
    )
    {
        var awardedByUserId = HttpContext.TryGetUserId();
        if (!awardedByUserId.HasValue)
        {
            return this.BadRequestError(AppMessages.Client.AuthCookieMissingClaims);
        }

        if (
            request is null
            || string.IsNullOrWhiteSpace(request.AwardedToUserId)
            || !Guid.TryParse(request.AwardedToUserId, out var awardedToUserId)
            || string.IsNullOrWhiteSpace(request.OperationType)
            || string.IsNullOrWhiteSpace(request.Reason)
            || string.IsNullOrWhiteSpace(request.RequestId)
            || !Guid.TryParse(request.RequestId, out var requestId)
        )
        {
            return this.BadRequestError(
                AppMessages.Client.GameQuestionInvalidRequest,
                AppMessages.ErrorCodes.GameQuestionInvalidRequest
            );
        }

        var result = await _gameQuizService.AwardManualQuizPointsAsync(
            new ManualQuizAwardInput(
                awardedToUserId,
                request.OperationType.Trim().ToLowerInvariant(),
                request.Points,
                request.Reason.Trim(),
                requestId
            ),
            awardedByUserId.Value,
            cancellationToken
        );

        return result.Outcome switch
        {
            ManualQuizAwardOutcome.Awarded when result.Award is not null =>
                StatusCode(StatusCodes.Status201Created, result.Award.ToDto()),
            ManualQuizAwardOutcome.NoActiveGame => this.NotFoundError(
                AppMessages.Client.GameQuizNoActiveGame,
                AppMessages.ErrorCodes.GameQuizNoActiveGame
            ),
            ManualQuizAwardOutcome.PlayerNotFound => this.NotFoundError(
                AppMessages.Client.GameQuizManualAwardPlayerNotFound,
                AppMessages.ErrorCodes.GameQuizManualAwardPlayerNotFound
            ),
            ManualQuizAwardOutcome.InvalidPoints => this.BadRequestError(
                AppMessages.Client.GameQuizManualAwardInvalidPoints,
                AppMessages.ErrorCodes.GameQuizManualAwardInvalidPoints
            ),
            ManualQuizAwardOutcome.InvalidOperation => this.BadRequestError(
                AppMessages.Client.GameQuizManualAwardInvalidOperation,
                AppMessages.ErrorCodes.GameQuizManualAwardInvalidOperation
            ),
            ManualQuizAwardOutcome.InvalidReason => this.BadRequestError(
                AppMessages.Client.GameQuizManualAwardInvalidReason,
                AppMessages.ErrorCodes.GameQuizManualAwardInvalidReason
            ),
            ManualQuizAwardOutcome.InsufficientPoints => this.StatusError(
                StatusCodes.Status409Conflict,
                AppMessages.Client.GameQuizManualAwardInsufficientPoints,
                AppMessages.ErrorCodes.GameQuizManualAwardInsufficientPoints
            ),
            ManualQuizAwardOutcome.DuplicateRequestConflict => this.StatusError(
                StatusCodes.Status409Conflict,
                AppMessages.Client.GameQuizManualAwardDuplicateRequestConflict,
                AppMessages.ErrorCodes.GameQuizManualAwardDuplicateRequestConflict
            ),
            _ => this.StatusError(
                StatusCodes.Status500InternalServerError,
                AppMessages.Client.UnexpectedServerError
            )
        };
    }
}
