using backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Backend.Tests.Unit.Data.Migrations;

public sealed class ApplicationMigrationChainTests
{
    [Fact]
    public void GetMigrations_IncludesEveryApplicationMigrationInChronologicalOrder()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(
                "Host=localhost;Database=deadmans_migration_chain_test;Username=test;Password=test"
            )
            .Options;
        using var dbContext = new ApplicationDbContext(options);

        Assert.False(dbContext.Database.HasPendingModelChanges());
        var migrations = dbContext.Database.GetMigrations().ToArray();

        Assert.Equal(
            [
                "20260908003848_ProductionBaseline",
                "20260910171900_AllowAdminTeamDisband",
                "20260911162438_AllowEquivalentQuestionAnswers",
                "20260912162321_RemoveUnavailableDraftQuestions",
                "20260913160212_LimitTeamNameLength",
                "20260913191016_AddTeamMemberReadiness",
                "20260917140000_AllowAdminTeamManagement",
                "20260919151237_ConvertQuizToMultipleChoice",
                "20260919162829_RenameQuizRoundToQuestionSession",
                "20260920001406_HardenQuizSubmissionHistory"
            ],
            migrations
        );
    }

    [Fact]
    public void GenerateScript_ForCompleteMigrationChain_SucceedsWithoutDatabaseConnection()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(
                "Host=localhost;Database=deadmans_migration_script_test;Username=test;Password=test"
            )
            .Options;
        using var dbContext = new ApplicationDbContext(options);
        var migrator = dbContext.GetService<IMigrator>();

        var script = migrator.GenerateScript(options: MigrationsSqlGenerationOptions.Idempotent);

        Assert.Contains("20260908003848_ProductionBaseline", script, StringComparison.Ordinal);
        Assert.Contains("CREATE EXTENSION IF NOT EXISTS citext", script, StringComparison.Ordinal);
        Assert.Contains("behavior_v2_snapshot_json", script, StringComparison.Ordinal);
        Assert.Contains("game_quiz_point_ledger_entries", script, StringComparison.Ordinal);
        Assert.Contains("ux_game_rounds_single_nonterminal_game", script, StringComparison.Ordinal);
        Assert.Contains("ux_games_single_current", script, StringComparison.Ordinal);
        Assert.Contains("deadmans_assert_game_finalization", script, StringComparison.Ordinal);
        Assert.Contains("ck_games_active_roster_settled", script, StringComparison.Ordinal);
        Assert.Contains("game_finalizations", script, StringComparison.Ordinal);
        Assert.Contains("game_team_final_results", script, StringComparison.Ordinal);
        Assert.Contains("ix_game_finalizations_request_id", script, StringComparison.Ordinal);
        Assert.Contains("user_role_audit_events", script, StringComparison.Ordinal);
        Assert.Contains("trg_user_role_audit_events_immutable", script, StringComparison.Ordinal);
        Assert.Contains(
            "20260911162438_AllowEquivalentQuestionAnswers",
            script,
            StringComparison.Ordinal
        );
        Assert.Contains("20260913160212_LimitTeamNameLength", script, StringComparison.Ordinal);
        Assert.Contains("character varying(18)", script, StringComparison.Ordinal);
        Assert.Contains("20260913191016_AddTeamMemberReadiness", script, StringComparison.Ordinal);
        Assert.Contains("ready_at_utc", script, StringComparison.Ordinal);
        Assert.Contains("ck_game_team_members_ready_semantics", script, StringComparison.Ordinal);
        Assert.Contains("20260919151237_ConvertQuizToMultipleChoice", script, StringComparison.Ordinal);
        Assert.Contains("20260919162829_RenameQuizRoundToQuestionSession", script, StringComparison.Ordinal);
        Assert.Contains("20260920001406_HardenQuizSubmissionHistory", script, StringComparison.Ordinal);
        Assert.Contains("game_quiz_submissions", script, StringComparison.Ordinal);
        Assert.Contains("game_quiz_question_sessions", script, StringComparison.Ordinal);
        Assert.Contains("question_session_id", script, StringComparison.Ordinal);
        Assert.Contains("deadmans_assert_question_options", script, StringComparison.Ordinal);
        Assert.Contains("trg_game_quiz_submissions_immutable", script, StringComparison.Ordinal);
        Assert.Contains("ck_game_quiz_question_sessions_option_ids_unique", script, StringComparison.Ordinal);
        Assert.Contains("Quiz rewards must match closed correct submissions exactly once", script, StringComparison.Ordinal);
        Assert.DoesNotContain("game_quiz_manual_awards", script, StringComparison.Ordinal);
    }

    [Fact]
    public void RenameQuizQuestionSessionMigration_PreservesExistingRows()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(
                "Host=localhost;Database=deadmans_migration_script_test;Username=test;Password=test"
            )
            .Options;
        using var dbContext = new ApplicationDbContext(options);
        var migrator = dbContext.GetService<IMigrator>();

        var script = migrator.GenerateScript(
            "20260919151237_ConvertQuizToMultipleChoice",
            "20260919162829_RenameQuizRoundToQuestionSession"
        );

        Assert.Contains(
            "ALTER TABLE game_quiz_rounds RENAME TO game_quiz_question_sessions",
            script,
            StringComparison.Ordinal
        );
        Assert.Contains(
            "RENAME COLUMN quiz_round_id TO question_session_id",
            script,
            StringComparison.Ordinal
        );
        Assert.DoesNotContain("DROP TABLE game_quiz_rounds", script, StringComparison.Ordinal);
        Assert.DoesNotContain("DROP TABLE game_quiz_question_sessions", script, StringComparison.Ordinal);
    }
}
