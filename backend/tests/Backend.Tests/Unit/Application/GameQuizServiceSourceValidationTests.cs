using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Application.Features.GameQuestions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests.Unit.Application;

public sealed class GameQuizServiceSourceValidationTests
{
    [Fact]
    public async Task AskQuizQuestionAsync_WhenTwitchDeliveryIsInvalidRejectsBeforeRepository()
    {
        var repository = new TrackingQuizRepository();
        var service = CreateService(repository);

        var result = await service.AskQuizQuestionAsync(
            null,
            new TwitchGameQuizQuestionDelivery(" ", "message")
        );

        Assert.Equal(AskGameQuizQuestionOutcome.InvalidDelivery, result.Outcome);
        Assert.False(repository.WasCalled);
    }

    [Theory]
    [InlineData("not-numeric", "viewer", "Viewer", "channel", "message")]
    [InlineData("123456", " ", "Viewer", "channel", "message")]
    [InlineData("123456", "viewer", "Viewer", " ", "message")]
    [InlineData("123456", "viewer", "Viewer", "channel", " ")]
    public async Task SubmitQuizAnswerAsync_WhenTwitchSourceIsInvalidRejectsBeforeRepository(
        string twitchUserId,
        string login,
        string displayName,
        string channelId,
        string messageId
    )
    {
        var repository = new TrackingQuizRepository();
        var service = CreateService(repository);

        var result = await service.SubmitQuizAnswerAsync(
            Guid.NewGuid(),
            new SubmitGameQuizAnswerInput(
                Guid.NewGuid(),
                new TwitchGameQuizAnswerSource(
                    twitchUserId,
                    login,
                    displayName,
                    channelId,
                    messageId
                )
            )
        );

        Assert.Equal(SubmitGameQuizAnswerOutcome.InvalidSource, result.Outcome);
        Assert.False(repository.WasCalled);
    }

    private static GameQuizService CreateService(IGameQuizRepository repository)
    {
        return new GameQuizService(
            repository,
            eventsPublisher: null!,
            TimeProvider.System,
            NullLogger<GameQuizService>.Instance
        );
    }

    private sealed class TrackingQuizRepository : IGameQuizRepository
    {
        public bool WasCalled { get; private set; }

        public Task<IReadOnlyList<AvailableGameQuizQuestion>> GetAvailableQuizQuestionsAsync(
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<Guid?> GetActiveGameIdAsync(CancellationToken cancellationToken = default)
        {
            WasCalled = true;
            throw new NotSupportedException();
        }

        public Task<AskQuizQuestionRepositoryResult> AskQuizQuestionAsync(
            Guid gameId,
            Guid? questionId,
            GameQuizQuestionDelivery delivery,
            CancellationToken cancellationToken = default
        )
        {
            WasCalled = true;
            throw new NotSupportedException();
        }

        public Task<SubmitQuizAnswerRepositoryResult> SubmitQuizAnswerAsync(
            Guid questionSessionId,
            SubmitGameQuizAnswerInput input,
            CancellationToken cancellationToken = default
        )
        {
            WasCalled = true;
            throw new NotSupportedException();
        }

        public Task<ManualQuizAwardResult> AwardManualQuizPointsAsync(
            ManualQuizAwardInput input,
            Guid awardedByUserId,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<ManualQuizAwardPlayer>> GetManualQuizAwardPlayersAsync(
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<CurrentGameQuizState?> GetCurrentQuizStateAsync(
            Guid userId,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<CloseExpiredQuizQuestionSessionsResult> CloseExpiredQuizQuestionSessionsAsync(
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();
    }
}
