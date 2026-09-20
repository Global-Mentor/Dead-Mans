using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations;

/// <inheritdoc />
public partial class RenameQuizRoundToQuestionSession : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "fk_quiz_submissions_round_same_game",
            table: "game_quiz_submissions");

        migrationBuilder.RenameTable(
            name: "game_quiz_rounds",
            newName: "game_quiz_question_sessions");

        migrationBuilder.RenameColumn(
            name: "quiz_round_id",
            table: "game_quiz_submissions",
            newName: "question_session_id");

        RenameIndexesToQuestionSessions(migrationBuilder);

        migrationBuilder.Sql(
            """
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT pk_game_quiz_rounds TO pk_game_quiz_question_sessions;
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT ak_game_quiz_rounds_game_id_id TO ak_game_quiz_question_sessions_game_id_id;
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT ck_game_quiz_rounds_ask_order_positive TO ck_game_quiz_question_sessions_ask_order_positive;
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT ck_game_quiz_rounds_close_semantics TO ck_game_quiz_question_sessions_close_semantics;
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT ck_game_quiz_rounds_delivery_kind_allowed TO ck_game_quiz_question_sessions_delivery_kind_allowed;
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT ck_game_quiz_rounds_delivery_source_semantics TO ck_game_quiz_question_sessions_delivery_source_semantics;
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT ck_game_quiz_rounds_snapshot TO ck_game_quiz_question_sessions_snapshot;
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT ck_game_quiz_rounds_status_allowed TO ck_game_quiz_question_sessions_status_allowed;
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT ck_game_quiz_rounds_window TO ck_game_quiz_question_sessions_window;
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT fk_game_quiz_rounds_enabled_question TO fk_game_quiz_question_sessions_enabled_question;
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT fk_game_quiz_rounds_games_game_id TO fk_game_quiz_question_sessions_games_game_id;
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT fk_game_quiz_rounds_question_definitions_question_id TO fk_quiz_question_sessions_question;
            ALTER TABLE game_quiz_question_sessions
                RENAME CONSTRAINT fk_game_quiz_rounds_users_asked_by_user_id TO fk_game_quiz_question_sessions_users_asked_by_user_id;

            ALTER TRIGGER trg_game_quiz_rounds_consistency
                ON game_quiz_question_sessions
                RENAME TO trg_game_quiz_question_sessions_consistency;
            ALTER TRIGGER trg_game_quiz_rounds_immutable_snapshot
                ON game_quiz_question_sessions
                RENAME TO trg_game_quiz_question_sessions_immutable_snapshot;

            ALTER FUNCTION deadmans_assert_quiz_round(uuid)
                RENAME TO deadmans_assert_quiz_question_session;
            ALTER FUNCTION deadmans_validate_quiz_round_trigger()
                RENAME TO deadmans_validate_quiz_question_session_trigger;
            ALTER FUNCTION deadmans_validate_quiz_round_update()
                RENAME TO deadmans_validate_quiz_question_session_update;

            DO $migration$
            DECLARE
                function_record record;
                definition text;
            BEGIN
                FOR function_record IN
                    SELECT proc.oid
                    FROM pg_proc proc
                    JOIN pg_namespace namespace ON namespace.oid = proc.pronamespace
                    WHERE namespace.nspname = 'public'
                      AND proc.prokind = 'f'
                      AND (
                          pg_get_functiondef(proc.oid) LIKE '%game_quiz_rounds%'
                          OR pg_get_functiondef(proc.oid) LIKE '%quiz_round_id%'
                          OR pg_get_functiondef(proc.oid) LIKE '%deadmans_assert_quiz_round%'
                          OR proc.proname = 'deadmans_validate_quiz_question_session_update'
                      )
                LOOP
                    definition := pg_get_functiondef(function_record.oid);
                    definition := replace(definition, 'game_quiz_rounds', 'game_quiz_question_sessions');
                    definition := replace(definition, 'quiz_round_id', 'question_session_id');
                    definition := replace(definition, 'deadmans_assert_quiz_round', 'deadmans_assert_quiz_question_session');
                    definition := replace(definition, 'ck_game_quiz_rounds_', 'ck_game_quiz_question_sessions_');
                    definition := replace(definition, 'trg_game_quiz_rounds_', 'trg_game_quiz_question_sessions_');
                    definition := replace(definition, 'quiz round', 'quiz question session');
                    definition := replace(definition, 'Quiz round', 'Quiz question session');
                    EXECUTE definition;
                END LOOP;
            END
            $migration$;
            """);

        migrationBuilder.AddForeignKey(
            name: "fk_quiz_submissions_question_session_same_game",
            table: "game_quiz_submissions",
            columns: new[] { "game_id", "question_session_id" },
            principalTable: "game_quiz_question_sessions",
            principalColumns: new[] { "game_id", "id" },
            onDelete: ReferentialAction.Restrict);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "fk_quiz_submissions_question_session_same_game",
            table: "game_quiz_submissions");

        migrationBuilder.RenameTable(
            name: "game_quiz_question_sessions",
            newName: "game_quiz_rounds");

        migrationBuilder.RenameColumn(
            name: "question_session_id",
            table: "game_quiz_submissions",
            newName: "quiz_round_id");

        RenameIndexesToQuizRounds(migrationBuilder);

        migrationBuilder.Sql(
            """
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT pk_game_quiz_question_sessions TO pk_game_quiz_rounds;
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT ak_game_quiz_question_sessions_game_id_id TO ak_game_quiz_rounds_game_id_id;
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT ck_game_quiz_question_sessions_ask_order_positive TO ck_game_quiz_rounds_ask_order_positive;
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT ck_game_quiz_question_sessions_close_semantics TO ck_game_quiz_rounds_close_semantics;
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT ck_game_quiz_question_sessions_delivery_kind_allowed TO ck_game_quiz_rounds_delivery_kind_allowed;
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT ck_game_quiz_question_sessions_delivery_source_semantics TO ck_game_quiz_rounds_delivery_source_semantics;
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT ck_game_quiz_question_sessions_snapshot TO ck_game_quiz_rounds_snapshot;
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT ck_game_quiz_question_sessions_status_allowed TO ck_game_quiz_rounds_status_allowed;
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT ck_game_quiz_question_sessions_window TO ck_game_quiz_rounds_window;
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT fk_game_quiz_question_sessions_enabled_question TO fk_game_quiz_rounds_enabled_question;
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT fk_game_quiz_question_sessions_games_game_id TO fk_game_quiz_rounds_games_game_id;
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT fk_quiz_question_sessions_question TO fk_game_quiz_rounds_question_definitions_question_id;
            ALTER TABLE game_quiz_rounds
                RENAME CONSTRAINT fk_game_quiz_question_sessions_users_asked_by_user_id TO fk_game_quiz_rounds_users_asked_by_user_id;

            ALTER TRIGGER trg_game_quiz_question_sessions_consistency
                ON game_quiz_rounds
                RENAME TO trg_game_quiz_rounds_consistency;
            ALTER TRIGGER trg_game_quiz_question_sessions_immutable_snapshot
                ON game_quiz_rounds
                RENAME TO trg_game_quiz_rounds_immutable_snapshot;

            ALTER FUNCTION deadmans_assert_quiz_question_session(uuid)
                RENAME TO deadmans_assert_quiz_round;
            ALTER FUNCTION deadmans_validate_quiz_question_session_trigger()
                RENAME TO deadmans_validate_quiz_round_trigger;
            ALTER FUNCTION deadmans_validate_quiz_question_session_update()
                RENAME TO deadmans_validate_quiz_round_update;

            DO $migration$
            DECLARE
                function_record record;
                definition text;
            BEGIN
                FOR function_record IN
                    SELECT proc.oid
                    FROM pg_proc proc
                    JOIN pg_namespace namespace ON namespace.oid = proc.pronamespace
                    WHERE namespace.nspname = 'public'
                      AND proc.prokind = 'f'
                      AND (
                          pg_get_functiondef(proc.oid) LIKE '%game_quiz_question_sessions%'
                          OR pg_get_functiondef(proc.oid) LIKE '%question_session_id%'
                          OR pg_get_functiondef(proc.oid) LIKE '%deadmans_assert_quiz_question_session%'
                          OR proc.proname = 'deadmans_validate_quiz_round_update'
                      )
                LOOP
                    definition := pg_get_functiondef(function_record.oid);
                    definition := replace(definition, 'game_quiz_question_sessions', 'game_quiz_rounds');
                    definition := replace(definition, 'question_session_id', 'quiz_round_id');
                    definition := replace(definition, 'deadmans_assert_quiz_question_session', 'deadmans_assert_quiz_round');
                    definition := replace(definition, 'ck_game_quiz_question_sessions_', 'ck_game_quiz_rounds_');
                    definition := replace(definition, 'trg_game_quiz_question_sessions_', 'trg_game_quiz_rounds_');
                    definition := replace(definition, 'quiz question session', 'quiz round');
                    definition := replace(definition, 'Quiz question session', 'Quiz round');
                    EXECUTE definition;
                END LOOP;
            END
            $migration$;
            """);

        migrationBuilder.AddForeignKey(
            name: "fk_quiz_submissions_round_same_game",
            table: "game_quiz_submissions",
            columns: new[] { "game_id", "quiz_round_id" },
            principalTable: "game_quiz_rounds",
            principalColumns: new[] { "game_id", "id" },
            onDelete: ReferentialAction.Restrict);
    }

    private static void RenameIndexesToQuestionSessions(MigrationBuilder migrationBuilder)
    {
        RenameIndex(migrationBuilder, "game_quiz_question_sessions", "ix_game_quiz_rounds_asked_by_user_id_asked_at_utc", "ix_game_quiz_question_sessions_asked_by_user_id_asked_at_utc");
        RenameIndex(migrationBuilder, "game_quiz_question_sessions", "ix_game_quiz_rounds_game_id_ask_order", "ix_game_quiz_question_sessions_game_id_ask_order");
        RenameIndex(migrationBuilder, "game_quiz_question_sessions", "ix_game_quiz_rounds_game_id_asked_at_utc", "ix_game_quiz_question_sessions_game_id_asked_at_utc");
        RenameIndex(migrationBuilder, "game_quiz_question_sessions", "ix_game_quiz_rounds_game_id_question_id", "ix_game_quiz_question_sessions_game_id_question_id");
        RenameIndex(migrationBuilder, "game_quiz_question_sessions", "ix_game_quiz_rounds_game_id_status", "ix_game_quiz_question_sessions_game_id_status");
        RenameIndex(migrationBuilder, "game_quiz_question_sessions", "ix_game_quiz_rounds_question_id", "ix_game_quiz_question_sessions_question_id");
        RenameIndex(migrationBuilder, "game_quiz_question_sessions", "ux_game_quiz_rounds_one_open", "ux_game_quiz_question_sessions_one_open");
        RenameIndex(migrationBuilder, "game_quiz_submissions", "ix_game_quiz_submissions_quiz_round_id_user_id", "ix_game_quiz_submissions_question_session_id_user_id");
        RenameIndex(migrationBuilder, "game_quiz_submissions", "ix_game_quiz_submissions_game_id_quiz_round_id", "ix_game_quiz_submissions_game_id_question_session_id");
    }

    private static void RenameIndexesToQuizRounds(MigrationBuilder migrationBuilder)
    {
        RenameIndex(migrationBuilder, "game_quiz_rounds", "ix_game_quiz_question_sessions_asked_by_user_id_asked_at_utc", "ix_game_quiz_rounds_asked_by_user_id_asked_at_utc");
        RenameIndex(migrationBuilder, "game_quiz_rounds", "ix_game_quiz_question_sessions_game_id_ask_order", "ix_game_quiz_rounds_game_id_ask_order");
        RenameIndex(migrationBuilder, "game_quiz_rounds", "ix_game_quiz_question_sessions_game_id_asked_at_utc", "ix_game_quiz_rounds_game_id_asked_at_utc");
        RenameIndex(migrationBuilder, "game_quiz_rounds", "ix_game_quiz_question_sessions_game_id_question_id", "ix_game_quiz_rounds_game_id_question_id");
        RenameIndex(migrationBuilder, "game_quiz_rounds", "ix_game_quiz_question_sessions_game_id_status", "ix_game_quiz_rounds_game_id_status");
        RenameIndex(migrationBuilder, "game_quiz_rounds", "ix_game_quiz_question_sessions_question_id", "ix_game_quiz_rounds_question_id");
        RenameIndex(migrationBuilder, "game_quiz_rounds", "ux_game_quiz_question_sessions_one_open", "ux_game_quiz_rounds_one_open");
        RenameIndex(migrationBuilder, "game_quiz_submissions", "ix_game_quiz_submissions_question_session_id_user_id", "ix_game_quiz_submissions_quiz_round_id_user_id");
        RenameIndex(migrationBuilder, "game_quiz_submissions", "ix_game_quiz_submissions_game_id_question_session_id", "ix_game_quiz_submissions_game_id_quiz_round_id");
    }

    private static void RenameIndex(MigrationBuilder migrationBuilder, string table, string name, string newName) =>
        migrationBuilder.RenameIndex(name: name, table: table, newName: newName);
}
