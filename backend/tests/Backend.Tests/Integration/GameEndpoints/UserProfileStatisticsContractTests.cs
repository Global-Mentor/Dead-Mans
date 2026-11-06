using System.Net.Http.Json;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Backend.Tests.Support;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed class UserProfileStatisticsContractTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task StatisticsUseOwnHistoricalFactsDistinctPlacementsAndActualRefunds()
    {
        factory.ResetDatabase();
        var userId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var now = new DateTime(2026, 11, 6, 12, 0, 0, DateTimeKind.Utc);
        using var authenticated = TestAuthClientFactory.CreateFactory(factory, [AuthRoleCodes.Viewer], userId,
            services => services.AddSingleton<TimeProvider>(new Clock(now)));
        using var client = authenticated.CreateClient();
        using var scope = authenticated.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Users.AddRange(new User { Id = userId, IsActive = true, Login = "owner", DisplayName = "Owner" },
            new User { Id = foreignId, IsActive = true, Login = "other", DisplayName = "Other" });
        var finished = Game(GameStatusValue.Finished);
        var active = Game(GameStatusValue.Active);
        var legacy = Game(GameStatusValue.Finished);
        var hidden = Game(GameStatusValue.Finished); hidden.IsDeleted = true;
        var draft = Game(GameStatusValue.Draft);
        var foreign = Game(GameStatusValue.Finished);
        var first = Round(finished, 10, At(3), userId);
        var second = Round(finished, -5, At(3), userId);
        var third = Round(active, 20, At(4), userId);
        Round(legacy, -2, new DateTime(2025, 11, 30, 12, 0, 0, DateTimeKind.Utc), userId);
        Round(hidden, 10000, At(6), userId);
        Round(draft, 10000, At(6), userId);
        Round(foreign, 10000, At(6), foreignId);
        var friend = Guid.NewGuid();
        foreach (var round in new[] { first, second })
            db.GameRoundParticipants.Add(new GameRoundParticipant { Id = Guid.NewGuid(), RoundId = round.Id, UserId = friend });
        db.GameRoundParticipants.Add(new GameRoundParticipant { Id = Guid.NewGuid(), RoundId = third.Id, UserId = Guid.NewGuid() });
        db.GameFinalizations.Add(new GameFinalization
        {
            GameId = finished.Id,
            FinishedByUserId = userId,
            FinishedAtUtc = now,
            TeamResults = [new GameTeamFinalResult { GameId = finished.Id, TeamId = first.TeamId, Placement = 3 },
                new GameTeamFinalResult { GameId = finished.Id, TeamId = second.TeamId, Placement = 1 }]
        });
        var question = new QuestionDefinition { Id = Guid.NewGuid(), Text = "Edited live question" };
        db.QuestionDefinitions.Add(question);
        Answer(finished, true, 5, "Old category", false, new DateTime(2026, 10, 31, 23, 59, 0, DateTimeKind.Utc));
        Answer(active, true, 7, "Screenshot category", true, At(1));
        Answer(finished, false, 0, "Old category", false, At(1).AddHours(1));
        Answer(legacy, true, 2, "Renamed category", false, At(2));
        Answer(hidden, true, 10000, "Hidden", false, At(6));
        Answer(draft, true, 10000, "Draft", false, At(6));
        Answer(foreign, true, 10000, "Foreign", false, At(6), owner: foreignId);
        Answer(active, true, 10000, "Open", false, At(6), GameQuizQuestionSessionStatusValue.Open);
        Answer(active, true, 10000, "Skipped", false, At(6), GameQuizQuestionSessionStatusValue.Skipped);
        var pendingRound = new GameRound { Id = Guid.NewGuid(), GameId = active.Id, TeamId = Guid.NewGuid(), Status = GameRoundStatusValue.InProgress };
        db.GameRounds.Add(pendingRound);
        var modifierA = Guid.NewGuid(); var modifierB = Guid.NewGuid();
        var applied = Modifier(first, modifierA, 10, GameModifierActivationStatusValue.Consumed);
        var cancelled = Modifier(first, modifierA, 5, GameModifierActivationStatusValue.Cancelled);
        Modifier(pendingRound, modifierB, 0, GameModifierActivationStatusValue.Active);
        var pending = Modifier(pendingRound, modifierB, 0, GameModifierActivationStatusValue.Consumed);
        Modifier(second, Guid.NewGuid(), 0, GameModifierActivationStatusValue.Cancelled);
        Modifier(first, modifierA, 1000, GameModifierActivationStatusValue.Consumed, foreignId);
        db.GameRoundModifierResults.AddRange(
            new GameRoundModifierResult
            {
                Id = Guid.NewGuid(),
                RoundId = first.Id,
                GameModifierActivationId = applied.Id,
                ModifierId = modifierA,
                OutcomeStatus = GameRoundModifierOutcomeValue.Violated,
                KillDelta = 3
            },
            new GameRoundModifierResult
            {
                Id = Guid.NewGuid(),
                RoundId = pendingRound.Id,
                GameModifierActivationId = pending.Id,
                ModifierId = modifierB,
                OutcomeStatus = GameRoundModifierOutcomeValue.Pending
            });
        Ledger(finished, GameQuizPointEntryTypeValue.ManualAdjustment, 20);
        Ledger(finished, GameQuizPointEntryTypeValue.ManualAdjustment, -3);
        Ledger(finished, GameQuizPointEntryTypeValue.ModifierPurchase, -10, applied.Id);
        Ledger(finished, GameQuizPointEntryTypeValue.ModifierPurchase, -5, cancelled.Id);
        Ledger(finished, GameQuizPointEntryTypeValue.ModifierRefund, 5, cancelled.Id);
        Ledger(hidden, GameQuizPointEntryTypeValue.ManualAdjustment, 10000);
        Ledger(draft, GameQuizPointEntryTypeValue.ManualAdjustment, 10000);
        Ledger(foreign, GameQuizPointEntryTypeValue.ManualAdjustment, 10000, owner: foreignId);
        await db.SaveChangesAsync();

        var profile = await client.GetFromJsonAsync<UserProfileDto>("/api/profile/me");
        Assert.NotNull(profile);
        var stats = profile.Statistics;
        Assert.Equal(2, stats.FinishedPlayerGameCount);
        Assert.Equal(4, stats.CompletedRoundCount);
        Assert.Equal(14, stats.AwardedQuizPoints);
        Assert.Equal(3, stats.Games.PlayedGameCount);
        Assert.Equal(1, stats.Games.RankedGameCount);
        Assert.Equal(1, stats.Games.WinCount);
        Assert.Equal(1, stats.Games.PodiumCount);
        Assert.Equal(1, stats.Games.BestPlacement);
        Assert.Equal(4, stats.Games.TeamCount);
        Assert.Equal(2, stats.Games.TeammateCount);
        Assert.Equal(23, stats.Games.TotalRoundScore);
        Assert.Equal(20, stats.Games.BestRoundScore);
        Assert.Equal(5.75m, stats.Games.AverageRoundScore);
        Assert.Equal(11, stats.Games.TeamKills);
        Assert.Equal(4, stats.Games.TeamBounties);
        Assert.Equal(4, stats.Quiz.AnswerCount);
        Assert.Equal(3.5m, stats.Quiz.AverageAnswerPoints);
        Assert.Equal(3, stats.Quiz.CorrectAnswerCount);
        Assert.Equal(1, stats.Quiz.IncorrectAnswerCount);
        Assert.Equal(new UserProfileQuizFormatStatisticsDto(3, 2, 7), stats.Quiz.Text);
        Assert.Equal(new UserProfileQuizFormatStatisticsDto(1, 1, 7), stats.Quiz.Screenshot);
        Assert.Equal(2, stats.Quiz.LongestCorrectStreak);
        Assert.Equal(1, stats.Quiz.MaxCorrectAnswersPerGame);
        Assert.Equal(7, stats.Quiz.MaxPointsPerGame);
        Assert.Equal(3, stats.Quiz.Categories.Count);
        Assert.Equal(2, stats.Quiz.Categories.Single(category => category.Name == "Old category").AnswerCount);
        Assert.Equal(new UserProfilePointStatisticsDto(20, 3, 15, 5, 10, 7.5m), stats.Points);
        Assert.Equal(5, stats.Modifiers.OrderedCount);
        Assert.Equal(2, stats.Modifiers.PaidCount);
        Assert.Equal(3, stats.Modifiers.FreeCount);
        Assert.Equal(1, stats.Modifiers.AppliedCount);
        Assert.Equal(2, stats.Modifiers.CancelledCount);
        Assert.Equal(2, stats.Modifiers.PendingCount);
        Assert.Equal(3, stats.Modifiers.UniqueCount);
        Assert.Equal(2, stats.Modifiers.GameCount);
        Assert.Equal(3, stats.Modifiers.RoundCount);
        Assert.Equal(new UserProfileModifierCountDto("Saved modifier", 1), stats.Modifiers.MostUsed);
        Assert.Equal(new UserProfileModifierOutcomeCountDto("violated", 1), Assert.Single(stats.Modifiers.Outcomes));
        Assert.Equal(5, Assert.Single(stats.Modifiers.Categories).Count);
        Assert.Equal(new DateTime(2025, 11, 30, 12, 0, 0, DateTimeKind.Utc), stats.Activity.FirstActivityAtUtc);
        Assert.Equal(At(5), stats.Activity.LastActivityAtUtc);
        Assert.Equal(7, stats.Activity.ActiveDayCount);
        Assert.Equal(12, stats.Activity.Months.Count);
        Assert.Equal("2025-12", stats.Activity.Months[0].Month);
        Assert.Equal(new UserProfileActivityMonthDto("2026-10", 1, 0, 1, 0), stats.Activity.Months[10]);
        Assert.Equal(new UserProfileActivityMonthDto("2026-11", 3, 3, 3, 5), stats.Activity.Months[11]);
        Assert.All(stats.Activity.Months.Take(10), month => Assert.Equal(0, month.GameCount));

        DateTime At(int day) => new(2026, 11, day, 0, 0, 0, DateTimeKind.Utc);
        Game Game(string status)
        {
            var game = new Game { Id = Guid.NewGuid(), Title = status, Status = status, CreatedAtUtc = now.AddMonths(-2) };
            db.Games.Add(game);
            return game;
        }
        GameRound Round(Game game, int score, DateTime at, Guid owner)
        {
            var round = new GameRound
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                TeamId = Guid.NewGuid(),
                Status = GameRoundStatusValue.Completed,
                FinalScore = score,
                KillsCount = 2,
                BountyCount = 1,
                FinishedAtUtc = at
            };
            db.GameRounds.Add(round);
            db.GameRoundParticipants.Add(new GameRoundParticipant { Id = Guid.NewGuid(), RoundId = round.Id, UserId = owner });
            return round;
        }
        void Answer(Game game, bool correct, int points, string category, bool screenshot, DateTime at,
            string status = GameQuizQuestionSessionStatusValue.Closed, Guid? owner = null)
        {
            var session = new GameQuizQuestionSession
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                QuestionId = question.Id,
                Status = status,
                CategoryNameSnapshot = category,
                ImageSnapshotJson = screenshot ? "{}" : null
            };
            db.AddRange(session, new GameQuizSubmission
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                QuestionSessionId = session.Id,
                UserId = owner ?? userId,
                SelectedOptionId = Guid.NewGuid(),
                IsCorrect = correct,
                AwardedPoints = points,
                SubmittedAtUtc = at
            });
        }
        GameModifierActivation Modifier(GameRound round, Guid modifierId, int cost, string status, Guid? owner = null)
        {
            var activation = new GameModifierActivation
            {
                Id = Guid.NewGuid(),
                GameId = round.GameId,
                RoundId = round.Id,
                ModifierId = modifierId,
                ModifierVersionId = Guid.NewGuid(),
                ActivatedByUserId = owner ?? userId,
                InitiatedByUserId = foreignId,
                ActivationCostSnapshot = cost,
                ModifierNameSnapshot = "Saved modifier",
                ModifierCategorySnapshot = "round",
                Status = status,
                ActivatedAtUtc = At(5),
                ArchivedAtUtc = status == "consumed" ? At(5) : null
            };
            db.GameModifierActivations.Add(activation);
            return activation;
        }
        void Ledger(Game game, string type, int delta, Guid? activationId = null, Guid? owner = null) =>
            db.GameQuizPointLedgerEntries.Add(new GameQuizPointLedgerEntry
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                UserId = owner ?? userId,
                EntryType = type,
                PointsDelta = delta,
                ModifierActivationId = activationId
            });
    }

    private sealed class Clock(DateTime now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(now, TimeSpan.Zero);
    }
}
