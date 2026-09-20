using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Domain.GameModifiers;
using backend.Infrastructure.Persistence;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class ProductionBaselineMigrationTests
{
    private const string BeforeMultipleChoice = "20260917140000_AllowAdminTeamManagement";

    [Theory]
    [InlineData("asked")]
    [InlineData("timeout")]
    [InlineData("skipped")]
    public async Task MultipleChoiceUpgrade_ResetsLegacyGameplayButPreservesIdentityAndAccess(string status)
    {
        await WithDatabaseAsync(async connectionString =>
        {
            var user = await SeedLegacyQuizAsync(connectionString, status);
            await MigrateAsync(connectionString);
            await using var db = CreateDbContext(connectionString);
            var retained = await db.Users.SingleAsync();
            Assert.Equal(user.Id, retained.Id);
            Assert.Equal(user.TwitchUserId, retained.TwitchUserId);
            Assert.Equal(user.Login, retained.Login);
            Assert.Equal(user.DisplayName, retained.DisplayName);
            Assert.Equal(user.IsActive, retained.IsActive);
            Assert.Equal(4, await db.Roles.CountAsync());
            Assert.Equal(user.Id, (await db.UserRoles.SingleAsync()).UserId);
            Assert.Single(await db.UserRoleAuditEvents.ToArrayAsync());
            Assert.Single(await db.MediaAssets.ToArrayAsync());
            Assert.Single(await db.QuestionCategories.ToArrayAsync());
            Assert.Single(await db.ModifierDefinitions.ToArrayAsync());
            Assert.Single(await db.ModifierDefinitionVersions.ToArrayAsync());
            Assert.Empty(await db.Games.ToArrayAsync());
            Assert.Empty(await db.GameTeams.ToArrayAsync());
            Assert.Empty(await db.GameEnabledQuestions.ToArrayAsync());
            Assert.Empty(await db.QuestionDefinitions.ToArrayAsync());
            Assert.Empty(await db.GameQuizQuestionSessions.ToArrayAsync());
            Assert.Empty(await db.GameQuizSubmissions.ToArrayAsync());
            Assert.Empty(await db.GameQuizPointLedgerEntries.ToArrayAsync());

            // A second deploy must not repeat the reset, and the new schema must
            // support normal publication, submission and exactly-once closure.
            var now = DateTime.UtcNow;
            var game = CreateGame(GameStatusValue.Draft, now);
            var question = CreateQuestion(await db.QuestionCategories.Select(x => x.Id).SingleAsync(), now);
            var correctId = Guid.NewGuid();
            var wrongId = Guid.NewGuid();
            question.Options =
            [
                new QuestionOption { Id = correctId, QuestionId = question.Id, Text = "Warsaw", NormalizedText = "warsaw", IsCorrect = true, SortOrder = 0, CreatedAtUtc = now },
                new QuestionOption { Id = wrongId, QuestionId = question.Id, Text = "Krakow", NormalizedText = "krakow", SortOrder = 1, CreatedAtUtc = now }
            ];
            db.AddRange(game, question);
            AddValidSetup(db, game, now, user);
            db.GameEnabledQuestions.Add(new GameEnabledQuestion
            {
                GameId = game.Id,
                QuestionId = question.Id,
                EnabledAtUtc = now,
                QuestionRevisionSnapshot = question.Revision,
                QuestionCodeSnapshot = question.ExternalCode,
                CategoryNameSnapshot = "Legacy",
                QuestionTextSnapshot = question.Text,
                OptionIdsSnapshot = [correctId, wrongId],
                OptionTextsSnapshot = ["Warsaw", "Krakow"],
                CorrectOptionIdSnapshot = correctId,
                RewardSnapshot = question.Reward,
                PrioritySnapshot = question.Priority,
                SnapshotAtUtc = now
            });
            await db.SaveChangesAsync();
            game.Status = GameStatusValue.Ready; game.ReadyAtUtc = now;
            await db.SaveChangesAsync();
            game.Status = GameStatusValue.Active; game.StartedAtUtc = now;
            await db.SaveChangesAsync();
            await MigrateAsync(connectionString);
            Assert.Equal(game.Id, (await db.Games.SingleAsync()).Id);

            var clock = new UpgradeClock(now.AddSeconds(1));
            var repository = new DbGameQuizRepository(db, clock);
            var asked = await repository.AskQuizQuestionAsync(game.Id, null, new ManualGameQuizQuestionDelivery(user.Id));
            Assert.NotNull(asked);
            var result = await repository.SubmitQuizAnswerAsync(asked.QuestionSessionId,
                new(correctId, new WebGameQuizAnswerSource(user.Id)));
            Assert.Equal(backend.Application.Abstractions.Repositories.SubmitQuizAnswerRepositoryOutcome.Accepted, result.Outcome);
            Assert.Empty(await db.GameQuizPointLedgerEntries.ToArrayAsync());
            clock.Now = asked.ClosesAtUtc;
            await repository.CloseExpiredQuizQuestionSessionsAsync();
            await repository.CloseExpiredQuizQuestionSessionsAsync();
            Assert.Equal(question.Reward, (await db.GameQuizPointLedgerEntries.SingleAsync()).PointsDelta);
        });
    }

    [Fact]
    public async Task MultipleChoiceUpgrade_FailureAfterResetRollsBackLegacyData()
    {
        await WithDatabaseAsync(async connectionString =>
        {
            await SeedLegacyQuizAsync(connectionString, "asked");
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = "DROP FUNCTION deadmans_assert_game_publication(uuid) CASCADE";
            await command.ExecuteNonQueryAsync();
            var exception = await Assert.ThrowsAsync<PostgresException>(() => MigrateAsync(connectionString));
            Assert.Contains("publication invariant is missing", exception.Message, StringComparison.Ordinal);
            command.CommandText = """
                SELECT (SELECT count(*) FROM games) = 1
                    AND (SELECT count(*) FROM question_definitions) = 2
                    AND (SELECT count(*) FROM game_quiz_rounds) = 2
                    AND (SELECT count(*) FROM game_quiz_correct_answers) = 1
                    AND (SELECT sum(points_delta) FROM game_quiz_point_ledger_entries) = 5
                    AND NOT EXISTS (SELECT 1 FROM __ef_migrations_history WHERE migration_id LIKE '%ConvertQuizToMultipleChoice');
                """;
            Assert.True(Assert.IsType<bool>(await command.ExecuteScalarAsync()));
        });
    }

    [Fact]
    public async Task MultipleChoiceUpgrade_UnexpectedDependentTableAbortsInsteadOfCascading()
    {
        await WithDatabaseAsync(async connectionString =>
        {
            await SeedLegacyQuizAsync(connectionString, "asked");
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = """
                CREATE TABLE future_game_data (game_id uuid PRIMARY KEY REFERENCES games(id));
                INSERT INTO future_game_data SELECT id FROM games;
                """;
            await command.ExecuteNonQueryAsync();
            var exception = await Assert.ThrowsAsync<PostgresException>(() => MigrateAsync(connectionString));
            Assert.Equal(PostgresErrorCodes.FeatureNotSupported, exception.SqlState);
            command.CommandText = "SELECT (SELECT count(*) FROM games) = 1 AND (SELECT count(*) FROM future_game_data) = 1";
            Assert.True(Assert.IsType<bool>(await command.ExecuteScalarAsync()));
        });
    }

    [Fact]
    public async Task MultipleChoiceDowngrade_RejectsPopulatedQuizWithoutDiscardingNewQuestions()
    {
        await WithDatabaseAsync(async connectionString =>
        {
            await MigrateAsync(connectionString);
            var now = DateTime.UtcNow;
            var category = new QuestionCategory { Id = Guid.NewGuid(), Name = "New quiz", CreatedAtUtc = now, UpdatedAtUtc = now };
            var question = CreateQuestion(category.Id, now);
            question.Options =
            [
                new QuestionOption { Id = Guid.NewGuid(), QuestionId = question.Id, Text = "Warsaw", NormalizedText = "warsaw", IsCorrect = true, SortOrder = 0, CreatedAtUtc = now },
                new QuestionOption { Id = Guid.NewGuid(), QuestionId = question.Id, Text = "Krakow", NormalizedText = "krakow", SortOrder = 1, CreatedAtUtc = now }
            ];
            await using var db = CreateDbContext(connectionString);
            db.AddRange(category, question);
            await db.SaveChangesAsync();
            var exception = await Assert.ThrowsAsync<PostgresException>(() =>
                db.GetService<IMigrator>().MigrateAsync(BeforeMultipleChoice));
            Assert.Contains("Restore a pre-upgrade backup", exception.Message, StringComparison.Ordinal);
            Assert.Equal(question.Id, (await db.QuestionDefinitions.AsNoTracking().SingleAsync()).Id);
            Assert.Equal(2, await db.QuestionOptions.CountAsync());
        });
    }

    private static async Task<User> SeedLegacyQuizAsync(string connectionString, string status)
    {
        await using var db = CreateDbContext(connectionString);
        await db.GetService<IMigrator>().MigrateAsync(BeforeMultipleChoice);
        var now = DateTime.UtcNow.AddMinutes(-5);
        var user = CreateUser(now);
        var game = CreateGame(GameStatusValue.Draft, now);
        var category = new QuestionCategory { Id = Guid.NewGuid(), Name = "Legacy", CreatedAtUtc = now, UpdatedAtUtc = now };
        db.AddRange(user, game, category,
            new UserRole { UserId = user.Id, RoleId = 1, AssignedAtUtc = now },
            new UserRoleAuditEvent { Id = Guid.NewGuid(), UserId = user.Id, RoleId = 1, Action = UserRoleAuditEvent.GrantedAction, OccurredAtUtc = now },
            new MediaAsset { Id = Guid.NewGuid(), Bucket = "test", ObjectKey = "card.png", MimeType = "image/png", SizeBytes = 1, CreatedAtUtc = now });
        AddValidSetup(db, game, now, user);
        await db.SaveChangesAsync();

        await TestModifierVersionFactory.AddAsync(db, new TestModifierSpec(
            Guid.NewGuid(), "Retained modifier", "Catalog survives upgrade", GameModifierCategories.Round,
            5, null, BuiltInModifierBehaviorCatalog.Get(BuiltInModifierBehaviorCatalog.Chirik).Behavior), now);

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            BEGIN;
            INSERT INTO question_definitions (id, external_code, category_id, text, reward, is_enabled, is_deleted, priority, created_at_utc, updated_at_utc)
                SELECT gen_random_uuid(), 'legacy-' || n, @category, 'Capital?', 5, true, false, 0, @now, @now FROM generate_series(1, 2) n;
            INSERT INTO question_accepted_answers (id, question_id, answer_text, normalized_answer, is_primary, sort_order, created_at_utc)
                SELECT gen_random_uuid(), id, 'Warsaw', 'warsaw', true, 0, @now FROM question_definitions;
            INSERT INTO game_enabled_questions (game_id, question_id, enabled_at_utc, question_revision_snapshot,
                question_code_snapshot, category_name_snapshot, question_text_snapshot, accepted_answers_snapshot,
                normalized_answers_snapshot, reward_snapshot, priority_snapshot, snapshot_at_utc)
                SELECT @game, id, @now, revision, external_code, 'Legacy', text, ARRAY['Warsaw'], ARRAY['warsaw'], reward, priority, @now
                FROM question_definitions;
            COMMIT;
            """;
        command.Parameters.AddWithValue("category", category.Id);
        command.Parameters.AddWithValue("game", game.Id);
        command.Parameters.AddWithValue("now", now);
        await command.ExecuteNonQueryAsync();
        game.Status = GameStatusValue.Ready; game.ReadyAtUtc = now;
        await db.SaveChangesAsync();
        game.Status = GameStatusValue.Active; game.StartedAtUtc = now;
        await db.SaveChangesAsync();

        command.CommandText = """
            BEGIN;
            INSERT INTO game_quiz_rounds (id, game_id, question_id, ask_order, asked_at_utc, closes_at_utc, closed_at_utc,
                asked_by_user_id, status, question_revision_snapshot, question_code_snapshot, category_name_snapshot,
                question_text_snapshot, accepted_answers_snapshot, normalized_answers_snapshot, reward_snapshot, delivery_kind)
                SELECT gen_random_uuid(), @game, question_id, row_number() OVER (ORDER BY question_code_snapshot),
                    @now, @now + interval '60 seconds',
                    CASE WHEN question_code_snapshot = 'legacy-1' THEN @now + interval '1 second'
                         WHEN @status = 'asked' THEN NULL ELSE @now + interval '60 seconds' END,
                    @user, CASE WHEN question_code_snapshot = 'legacy-1' THEN 'answered_correct' ELSE @status END,
                    question_revision_snapshot, question_code_snapshot, category_name_snapshot,
                    question_text_snapshot, accepted_answers_snapshot, normalized_answers_snapshot, reward_snapshot, 'manual'
                FROM game_enabled_questions;
            INSERT INTO game_quiz_correct_answers (id, game_id, quiz_round_id, awarded_to_user_id, captured_by_user_id,
                submitted_answer, normalized_answer, twitch_user_id_snapshot, login_snapshot, display_name_snapshot, source_provider, answered_at_utc)
                SELECT gen_random_uuid(), @game, round.id, @user, @user, 'Warsaw', 'warsaw',
                    participant.twitch_user_id, participant.login, participant.display_name, 'manual', round.closed_at_utc
                FROM game_quiz_rounds round CROSS JOIN users participant WHERE round.status = 'answered_correct';
            INSERT INTO game_quiz_point_ledger_entries (id, game_id, user_id, entry_type, points_delta, correct_answer_id,
                available_points_before, available_points_after, occurred_at_utc)
                SELECT gen_random_uuid(), @game, @user, 'quiz_reward', 5, id, 0, 5, answered_at_utc FROM game_quiz_correct_answers;
            COMMIT;
            """;
        command.Parameters.AddWithValue("user", user.Id);
        command.Parameters.AddWithValue("status", status);
        await command.ExecuteNonQueryAsync();
        return user;
    }

    private sealed class UpgradeClock(DateTime now) : TimeProvider
    {
        public DateTime Now { get; set; } = now;
        public override DateTimeOffset GetUtcNow() => new(Now, TimeSpan.Zero);
    }
}
