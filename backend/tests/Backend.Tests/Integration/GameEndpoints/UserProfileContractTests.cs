using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Domain.Questions;
using Backend.Tests.Support;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed class UserProfileContractTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Theory]
    [InlineData("/api/profile/me")]
    [InlineData("/api/profile/me/games")]
    [InlineData("/api/profile/me/games?participation=quiz")]
    [InlineData("/api/profile/me/answers")]
    public async Task ProfileRequiresAuthentication(string path)
    {
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(path)).StatusCode);
    }

    [Theory]
    [InlineData("games?page=0")]
    [InlineData("games?pageSize=101")]
    [InlineData("games?participation=all")]
    [InlineData("games?participation=Player")]
    [InlineData("games?participation=")]
    [InlineData("answers?page=-1")]
    [InlineData("answers?pageSize=0")]
    [InlineData("answers?gameId=invalid")]
    public async Task ProfileRejectsInvalidPageAndFilterParameters(string suffix)
    {
        using var client = TestAuthClientFactory.CreateClient(factory, [AuthRoleCodes.Viewer]);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/profile/me/" + suffix)).StatusCode);
    }

    [Fact]
    public async Task FreshActiveProfileReturnsNumericZerosAndEmptyClampedPages()
    {
        factory.ResetDatabase();
        var userId = Guid.NewGuid();
        using var authenticated = TestAuthClientFactory.CreateFactory(factory, [AuthRoleCodes.Viewer], userId);
        using var client = authenticated.CreateClient();
        using var scope = authenticated.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Users.Add(new User { Id = userId, IsActive = true, Login = "newcomer", DisplayName = "New player" });
        await db.SaveChangesAsync();

        var profile = await client.GetFromJsonAsync<JsonElement>("/api/profile/me");
        foreach (var field in new[] { "playerGameCount", "quizGameCount", "answerCount", "correctAnswerCount" })
        {
            Assert.Equal(JsonValueKind.Number, profile.GetProperty(field).ValueKind);
            Assert.Equal(0, profile.GetProperty(field).GetInt32());
        }
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("profileImageUrl").ValueKind);
        var statistics = profile.GetProperty("statistics");
        foreach (var field in new[] { "finishedPlayerGameCount", "completedRoundCount", "awardedQuizPoints" })
        {
            Assert.Equal(JsonValueKind.Number, statistics.GetProperty(field).ValueKind);
            Assert.Equal(0, statistics.GetProperty(field).GetInt32());
        }
        Assert.Equal(JsonValueKind.Null, statistics.GetProperty("games").GetProperty("bestPlacement").ValueKind);
        Assert.Equal(JsonValueKind.Null, statistics.GetProperty("games").GetProperty("bestRoundScore").ValueKind);
        Assert.Equal(JsonValueKind.Null, statistics.GetProperty("modifiers").GetProperty("mostUsed").ValueKind);
        Assert.Equal(12, statistics.GetProperty("activity").GetProperty("months").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, statistics.GetProperty("activity").GetProperty("firstActivityAtUtc").ValueKind);
        foreach (var path in new[]
        {
            "games?participation=player&page=99&pageSize=7",
            "games?participation=quiz&page=99&pageSize=7",
            "answers?page=99&pageSize=7",
            $"answers?gameId={Guid.NewGuid()}&page=99&pageSize=7"
        })
        {
            var page = await client.GetFromJsonAsync<JsonElement>("/api/profile/me/" + path);
            Assert.Equal(JsonValueKind.Array, page.GetProperty("items").ValueKind);
            Assert.Equal(0, page.GetProperty("items").GetArrayLength());
            Assert.Equal(0, page.GetProperty("totalCount").GetInt32());
            Assert.Equal(1, page.GetProperty("page").GetInt32());
            Assert.Equal(7, page.GetProperty("pageSize").GetInt32());
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task SingleParticipationPreservesZeroStatisticsAndNullableDetails(bool quizOnly)
    {
        factory.ResetDatabase();
        var userId = Guid.NewGuid();
        using var authenticated = TestAuthClientFactory.CreateFactory(factory, [AuthRoleCodes.Viewer], userId);
        using var client = authenticated.CreateClient();
        using var scope = authenticated.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var now = DateTime.UtcNow;
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Title = "No earned points",
            Status = quizOnly ? GameStatusValue.Finished : GameStatusValue.Ready,
            CreatedAtUtc = now,
            StartedAtUtc = quizOnly ? now : null,
            FinishedAtUtc = quizOnly ? now : null
        };
        db.AddRange(new User { Id = userId, IsActive = true, Login = "participant", DisplayName = "Participant" }, game);
        if (quizOnly)
        {
            var question = new QuestionDefinition { Id = Guid.NewGuid(), Text = "Question" };
            var session = new GameQuizQuestionSession
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                QuestionId = question.Id,
                Status = GameQuizQuestionSessionStatusValue.Closed,
                QuestionTextSnapshot = "Historical question",
                CategoryNameSnapshot = "Category"
            };
            db.AddRange(question, session, new GameQuizSubmission
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                QuestionSessionId = session.Id,
                UserId = userId,
                SelectedOptionId = Guid.NewGuid(),
                SelectedOptionTextSnapshot = "Incorrect choice",
                IsCorrect = false,
                AwardedPoints = 0,
                SubmittedAtUtc = now
            });
        }
        else
            db.GameTeamMembers.Add(new GameTeamMember { Id = Guid.NewGuid(), GameId = game.Id, UserId = userId });
        await db.SaveChangesAsync();

        var profile = await client.GetFromJsonAsync<UserProfileDto>("/api/profile/me");
        Assert.NotNull(profile);
        Assert.Equal(quizOnly ? 0 : 1, profile.PlayerGameCount);
        Assert.Equal(quizOnly ? 1 : 0, profile.QuizGameCount);
        Assert.Equal(quizOnly ? 1 : 0, profile.AnswerCount);
        Assert.Equal(0, profile.CorrectAnswerCount);
        Assert.Equal(0, profile.Statistics.FinishedPlayerGameCount);
        Assert.Equal(0, profile.Statistics.CompletedRoundCount);
        Assert.Equal(0, profile.Statistics.AwardedQuizPoints);
        Assert.Equal(quizOnly ? 1 : 0, profile.Statistics.Quiz.AnswerCount);
        Assert.Equal(0, profile.Statistics.Quiz.CorrectAnswerCount);
        Assert.Equal(quizOnly ? 1 : 0, profile.Statistics.Quiz.IncorrectAnswerCount);
        Assert.Equal(0, profile.Statistics.Quiz.LongestCorrectStreak);
        var participation = quizOnly ? "quiz" : "player";
        var games = await client.GetFromJsonAsync<UserProfileGamesPageDto>($"/api/profile/me/games?participation={participation}&page=99&pageSize=7");
        Assert.NotNull(games);
        Assert.Equal(1, games.TotalCount);
        Assert.Equal(1, games.Page);
        var item = Assert.Single(games.Items);
        Assert.Equal(0, item.CompletedRoundCount);
        Assert.Equal(quizOnly ? 1 : 0, item.AnswerCount);
        Assert.Equal(0, item.CorrectAnswerCount);
        Assert.Equal(game.StartedAtUtc, item.StartedAtUtc);
        Assert.Equal(game.FinishedAtUtc, item.FinishedAtUtc);
        var otherParticipation = quizOnly ? "player" : "quiz";
        var otherGames = await client.GetFromJsonAsync<UserProfileGamesPageDto>($"/api/profile/me/games?participation={otherParticipation}");
        Assert.NotNull(otherGames);
        Assert.Equal(0, otherGames.TotalCount);
        Assert.Empty(otherGames.Items);
        var answers = await client.GetFromJsonAsync<UserProfileAnswersPageDto>($"/api/profile/me/answers?gameId={game.Id}");
        Assert.NotNull(answers);
        if (quizOnly)
        {
            var answer = Assert.Single(answers.Items);
            Assert.False(answer.IsCorrect);
            Assert.Equal(0, answer.AwardedPoints);
            Assert.Null(answer.Image);
        }
        else
            Assert.Empty(answers.Items);
    }

    [Fact]
    public async Task InactiveIdentityCannotReadAnyProfileEndpoint()
    {
        factory.ResetDatabase();
        var userId = Guid.NewGuid();
        using var authenticated = TestAuthClientFactory.CreateFactory(factory, [AuthRoleCodes.Viewer], userId);
        using var client = authenticated.CreateClient();
        using var scope = authenticated.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Users.Add(new User { Id = userId, IsActive = false, Login = "inactive", DisplayName = "Inactive user" });
        await db.SaveChangesAsync();
        foreach (var suffix in new[] { "", "/games", "/games?participation=quiz", "/answers" })
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/profile/me" + suffix)).StatusCode);
    }

    [Fact]
    public async Task QuizStatisticsUseAllGamesBeyondTheFirstPageAndSaturatePoints()
    {
        factory.ResetDatabase();
        var userId = Guid.NewGuid();
        using var authenticated = TestAuthClientFactory.CreateFactory(factory, [AuthRoleCodes.Viewer], userId);
        using var client = authenticated.CreateClient();
        using var scope = authenticated.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Users.Add(new User { Id = userId, IsActive = true, Login = "quiz-player", DisplayName = "Quiz player" });
        var now = DateTime.UtcNow;
        var question = new QuestionDefinition { Id = Guid.NewGuid(), Text = "Live question" };
        db.QuestionDefinitions.Add(question);
        for (var index = 0; index < 20; index++)
            AddGame(Guid.NewGuid(), now.AddDays(-index), 1, int.MaxValue);
        var bestGameId = Guid.Parse("10000000-0000-0000-0000-000000000002");
        AddGame(bestGameId, now.AddDays(-20), 3, 1);
        AddGame(Guid.Parse("10000000-0000-0000-0000-000000000001"), now.AddDays(-20), 3, 20);
        AddGame(Guid.Parse("10000000-0000-0000-0000-000000000003"), now.AddDays(-21), 3, 10);
        await db.SaveChangesAsync();

        var firstPage = await client.GetFromJsonAsync<UserProfileGamesPageDto>("/api/profile/me/games?participation=quiz&pageSize=20");
        Assert.NotNull(firstPage);
        Assert.Equal(23, firstPage.TotalCount);
        Assert.Equal(20, firstPage.Items.Count);
        Assert.DoesNotContain(firstPage.Items, game => game.GameId == bestGameId.ToString());
        var profile = await client.GetFromJsonAsync<UserProfileDto>("/api/profile/me");
        Assert.NotNull(profile);
        Assert.Equal(0, profile.PlayerGameCount);
        Assert.Equal(23, profile.QuizGameCount);
        Assert.Equal(29, profile.CorrectAnswerCount);
        Assert.Equal(0, profile.Statistics.FinishedPlayerGameCount);
        Assert.Equal(0, profile.Statistics.CompletedRoundCount);
        Assert.Equal(int.MaxValue, profile.Statistics.AwardedQuizPoints);
        Assert.Equal(3, profile.Statistics.Quiz.MaxCorrectAnswersPerGame);
        Assert.Equal(int.MaxValue, profile.Statistics.Quiz.MaxPointsPerGame);
        Assert.Equal(29, profile.Statistics.Quiz.LongestCorrectStreak);
        Assert.Equal(29, profile.Statistics.Quiz.Text.AnswerCount);
        Assert.Equal(0, profile.Statistics.Quiz.Screenshot.AnswerCount);
        Assert.Equal(((decimal)int.MaxValue * 20 + 93) / 29, profile.Statistics.Quiz.AverageAnswerPoints);

        void AddGame(Guid gameId, DateTime startedAt, int correctAnswers, int points)
        {
            db.Games.Add(new Game
            {
                Id = gameId,
                Title = "Quiz " + gameId,
                Status = GameStatusValue.Finished,
                CreatedAtUtc = startedAt,
                StartedAtUtc = startedAt,
                FinishedAtUtc = startedAt.AddHours(1)
            });
            for (var index = 0; index < correctAnswers; index++)
            {
                var session = new GameQuizQuestionSession
                {
                    Id = Guid.NewGuid(),
                    GameId = gameId,
                    QuestionId = question.Id,
                    Status = GameQuizQuestionSessionStatusValue.Closed,
                    QuestionTextSnapshot = "Historical question",
                    CategoryNameSnapshot = "Category"
                };
                db.AddRange(session, new GameQuizSubmission
                {
                    Id = Guid.NewGuid(),
                    GameId = gameId,
                    QuestionSessionId = session.Id,
                    UserId = userId,
                    SelectedOptionId = Guid.NewGuid(),
                    SelectedOptionTextSnapshot = "Correct",
                    IsCorrect = true,
                    AwardedPoints = points,
                    SubmittedAtUtc = startedAt.AddMinutes(index)
                });
            }
        }
    }

    [Fact]
    public async Task OwnProfileCountsParticipationAndClosedAnswersWithoutReadingLiveCatalog()
    {
        factory.ResetDatabase();
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        using var authenticated = TestAuthClientFactory.CreateFactory(factory, [AuthRoleCodes.Viewer], ownerId);
        using var client = authenticated.CreateClient();
        using var scope = authenticated.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var owner = new User { Id = ownerId, Login = "owner", DisplayName = "Own profile", ProfileImageUrl = "https://example.test/avatar.png" };
        db.Users.AddRange(owner, new User { Id = foreignId, Login = "other", DisplayName = "Other player" });
        var now = DateTime.UtcNow;
        var memberGame = Game("Current membership");
        var roundGame = Game("Historical round");
        roundGame.Status = GameStatusValue.Active;
        roundGame.FinishedAtUtc = null;
        var answerGame = Game("Closed answers");
        var modifierGame = Game("Modifier alone");
        var manualGame = Game("Manual award alone");
        var leftGame = Game("Left roster alone");
        var cancelledModifierGame = Game("Cancelled purchase alone");
        var hiddenGame = Game("Deleted game"); hiddenGame.IsDeleted = true;
        var draftGame = Game("Draft"); draftGame.Status = GameStatusValue.Draft;
        var openGame = Game("Open question");
        var skippedGame = Game("Skipped question");
        var foreignGame = Game("Other player only");
        db.Games.AddRange(memberGame, roundGame, answerGame, modifierGame, manualGame, leftGame, cancelledModifierGame,
            hiddenGame, draftGame, openGame, skippedGame, foreignGame);
        foreach (var game in new[] { memberGame, hiddenGame, draftGame })
            db.GameTeamMembers.Add(new GameTeamMember { Id = Guid.NewGuid(), GameId = game.Id, UserId = ownerId });
        db.GameTeamMembers.Add(new GameTeamMember { Id = Guid.NewGuid(), GameId = leftGame.Id, UserId = ownerId, LeftAtUtc = now });
        var round = new GameRound { Id = Guid.NewGuid(), GameId = roundGame.Id, Status = GameRoundStatusValue.Completed };
        db.GameRounds.Add(round);
        db.GameRoundParticipants.Add(new GameRoundParticipant { Id = Guid.NewGuid(), RoundId = round.Id, UserId = ownerId, DisplayNameSnapshot = "Historic owner" });
        db.GameRoundParticipants.Add(new GameRoundParticipant { Id = Guid.NewGuid(), RoundId = round.Id, UserId = foreignId, DisplayNameSnapshot = "Other participant" });
        foreach (var game in new[] { memberGame, hiddenGame, draftGame })
        {
            var excludedRound = new GameRound
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                Status = game == memberGame ? GameRoundStatusValue.Cancelled : GameRoundStatusValue.Completed
            };
            db.GameRounds.Add(excludedRound);
            db.GameRoundParticipants.Add(new GameRoundParticipant { Id = Guid.NewGuid(), RoundId = excludedRound.Id, UserId = ownerId });
        }
        db.GameModifierActivations.AddRange(
            new GameModifierActivation { Id = Guid.NewGuid(), GameId = modifierGame.Id, RoundId = Guid.NewGuid(), ModifierId = Guid.NewGuid(), ModifierVersionId = Guid.NewGuid(), ActivatedByUserId = ownerId, InitiatedByUserId = ownerId },
            new GameModifierActivation { Id = Guid.NewGuid(), GameId = cancelledModifierGame.Id, RoundId = Guid.NewGuid(), ModifierId = Guid.NewGuid(), ModifierVersionId = Guid.NewGuid(), ActivatedByUserId = ownerId, InitiatedByUserId = ownerId, Status = GameModifierActivationStatusValue.Cancelled });
        db.GameQuizPointLedgerEntries.Add(new GameQuizPointLedgerEntry { Id = Guid.NewGuid(), GameId = manualGame.Id, UserId = ownerId, EntryType = GameQuizPointEntryTypeValue.ManualAdjustment, PointsDelta = 10 });
        var question = new QuestionDefinition { Id = Guid.NewGuid(), Text = "Edited live catalog text" };
        db.QuestionDefinitions.Add(question);
        var selectedId = Guid.NewGuid();
        var image = new QuizImageSnapshot(Guid.NewGuid(), "bucket/quiz/screenshots/historical.png", new Dictionary<string, string>(),
            new Dictionary<Guid, IReadOnlyDictionary<string, string>>())
        { ThumbnailPath = "bucket/quiz/thumbnails/historical.webp" };
        var ownClosed = Answer(answerGame, ownerId, GameQuizQuestionSessionStatusValue.Closed, true, now, image.ToJson());
        Answer(answerGame, ownerId, GameQuizQuestionSessionStatusValue.Closed, false, now.AddMinutes(-1));
        Answer(memberGame, ownerId, GameQuizQuestionSessionStatusValue.Closed, false, now.AddMinutes(-2));
        Answer(answerGame, foreignId, GameQuizQuestionSessionStatusValue.Closed, true, now);
        Answer(hiddenGame, ownerId, GameQuizQuestionSessionStatusValue.Closed, true, now);
        Answer(draftGame, ownerId, GameQuizQuestionSessionStatusValue.Closed, true, now);
        Answer(openGame, ownerId, GameQuizQuestionSessionStatusValue.Open, true, now);
        Answer(skippedGame, ownerId, GameQuizQuestionSessionStatusValue.Skipped, true, now);
        Answer(foreignGame, foreignId, GameQuizQuestionSessionStatusValue.Closed, true, now);
        await db.SaveChangesAsync();

        var profile = await client.GetFromJsonAsync<UserProfileDto>($"/api/profile/me?userId={foreignId}");
        Assert.NotNull(profile);
        Assert.Equal(ownerId.ToString(), profile.UserId);
        Assert.Equal("owner", profile.Login);
        Assert.Equal(owner.ProfileImageUrl, profile.ProfileImageUrl);
        Assert.Equal(2, profile.PlayerGameCount);
        Assert.Equal(2, profile.QuizGameCount);
        Assert.Equal(3, profile.AnswerCount);
        Assert.Equal(1, profile.CorrectAnswerCount);
        Assert.Equal(1, profile.Statistics.FinishedPlayerGameCount);
        Assert.Equal(1, profile.Statistics.CompletedRoundCount);
        Assert.Equal(7, profile.Statistics.AwardedQuizPoints);
        Assert.Equal(3, profile.Statistics.Quiz.AnswerCount);
        Assert.Equal(1, profile.Statistics.Quiz.Screenshot.CorrectAnswerCount);
        Assert.Equal(2, profile.Statistics.Quiz.Text.AnswerCount - profile.Statistics.Quiz.Text.CorrectAnswerCount);
        var games = await client.GetFromJsonAsync<UserProfileGamesPageDto>($"/api/profile/me/games?pageSize=1&userId={foreignId}");
        Assert.NotNull(games);
        Assert.Equal(2, games.TotalCount);
        Assert.Single(games.Items);
        var secondPage = await client.GetFromJsonAsync<UserProfileGamesPageDto>("/api/profile/me/games?participation=player&page=2&pageSize=1");
        Assert.NotNull(secondPage);
        var allGames = games.Items.Concat(secondPage.Items).ToArray();
        Assert.Equal(2, allGames.Select(game => game.GameId).Distinct().Count());
        Assert.Equal(new[] { memberGame.Id.ToString(), roundGame.Id.ToString() }.Order(), allGames.Select(game => game.GameId).Order());
        Assert.Equal(1, allGames.Single(game => game.GameId == roundGame.Id.ToString()).CompletedRoundCount);
        Assert.Equal(1, allGames.Single(game => game.GameId == memberGame.Id.ToString()).AnswerCount);
        var quizFirst = await client.GetFromJsonAsync<UserProfileGamesPageDto>($"/api/profile/me/games?participation=quiz&pageSize=1&userId={foreignId}");
        var quizLast = await client.GetFromJsonAsync<UserProfileGamesPageDto>("/api/profile/me/games?participation=quiz&page=99&pageSize=1");
        Assert.NotNull(quizFirst);
        Assert.NotNull(quizLast);
        Assert.Equal(2, quizFirst.TotalCount);
        Assert.Equal(2, quizLast.TotalCount);
        Assert.Equal(2, quizLast.Page);
        Assert.Single(quizFirst.Items);
        Assert.Single(quizLast.Items);
        var quizGames = quizFirst.Items.Concat(quizLast.Items).ToArray();
        Assert.Equal(new[] { memberGame.Id.ToString(), answerGame.Id.ToString() }.Order(), quizGames.Select(game => game.GameId).Order());
        Assert.Equal(2, quizGames.Single(game => game.GameId == answerGame.Id.ToString()).AnswerCount);
        var answers = await client.GetFromJsonAsync<UserProfileAnswersPageDto>($"/api/profile/me/answers?gameId={answerGame.Id}&pageSize=1&userId={foreignId}");
        Assert.NotNull(answers);
        Assert.Equal(2, answers.TotalCount);
        var item = Assert.Single(answers.Items);
        Assert.Equal(ownClosed.QuestionSessionId.ToString(), item.QuestionSessionId);
        Assert.Equal(question.Id.ToString(), item.QuestionId);
        Assert.Equal("Historical question", item.QuestionText);
        Assert.Equal("Historic category", item.CategoryName);
        Assert.Equal("Historical selected answer", item.SelectedOptionText);
        Assert.Equal(selectedId.ToString(), item.SelectedOptionId);
        Assert.Equal(7, item.AwardedPoints);
        Assert.EndsWith(image.MediaPath, item.Image!.ImageUrl, StringComparison.Ordinal);
        Assert.EndsWith(image.ThumbnailPath, item.Image.ThumbnailUrl, StringComparison.Ordinal);
        Assert.Empty((await client.GetFromJsonAsync<UserProfileAnswersPageDto>($"/api/profile/me/answers?gameId={foreignGame.Id}"))!.Items);

        Game Game(string title) => new() { Id = Guid.NewGuid(), Title = title, Status = GameStatusValue.Finished, CreatedAtUtc = now, FinishedAtUtc = now };
        GameQuizSubmission Answer(Game game, Guid userId, string status, bool correct, DateTime at, string? snapshot = null)
        {
            var session = new GameQuizQuestionSession
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                QuestionId = question.Id,
                Status = status,
                QuestionTextSnapshot = "Historical question",
                CategoryNameSnapshot = "Historic category",
                ImageSnapshotJson = snapshot
            };
            var answer = new GameQuizSubmission
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                QuestionSessionId = session.Id,
                UserId = userId,
                SelectedOptionId = selectedId,
                SelectedOptionTextSnapshot = "Historical selected answer",
                IsCorrect = correct,
                AwardedPoints = correct ? 7 : 0,
                SubmittedAtUtc = at
            };
            db.AddRange(session, answer);
            return answer;
        }
    }
}
