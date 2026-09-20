using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class ConvertQuizToMultipleChoice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            ResetPreReleaseQuizData(migrationBuilder);

            // The production baseline installs deferred PostgreSQL invariants for the
            // original free-text quiz schema. Replace the publication function before
            // removing its source table, and remove the functions whose row types and
            // triggers refer to the old answer/winner tables.
            migrationBuilder.Sql(
                """
                DO $migration$
                DECLARE
                    definition text;
                BEGIN
                    SELECT pg_get_functiondef(proc.oid)
                    INTO definition
                    FROM pg_proc proc
                    JOIN pg_namespace namespace ON namespace.oid = proc.pronamespace
                    WHERE namespace.nspname = 'public'
                      AND proc.proname = 'deadmans_assert_game_publication'
                      AND pg_get_function_identity_arguments(proc.oid) = 'p_game_id uuid';

                    IF definition IS NULL THEN
                        RAISE EXCEPTION 'The game publication invariant is missing.';
                    END IF;

                    definition := replace(definition, 'question_accepted_answers', 'question_options');
                    definition := replace(definition, 'answer.answer_text::text', 'answer.id');
                    definition := replace(definition, 'answer.normalized_answer::text', 'answer.text::text');
                    definition := replace(definition, 'answer.is_primary DESC, ', '');
                    definition := replace(definition, 'accepted_answers_snapshot', 'option_ids_snapshot');
                    definition := replace(definition, 'normalized_answers_snapshot', 'option_texts_snapshot');
                    definition := replace(
                        definition,
                        'enabled.priority_snapshot <> question.priority',
                        'enabled.priority_snapshot <> question.priority
                          OR enabled.correct_option_id_snapshot IS DISTINCT FROM (
                              SELECT option.id
                              FROM question_options option
                              WHERE option.question_id = question.id AND option.is_correct
                          )'
                    );

                    IF strpos(definition, 'question_accepted_answers') > 0
                       OR strpos(definition, 'accepted_answers_snapshot') > 0
                       OR strpos(definition, 'normalized_answers_snapshot') > 0
                       OR strpos(definition, 'answer_text') > 0
                       OR strpos(definition, 'normalized_answer') > 0
                       OR strpos(definition, 'is_primary') > 0 THEN
                        RAISE EXCEPTION 'Could not upgrade the game publication invariant.';
                    END IF;

                    EXECUTE definition;
                END
                $migration$;

                DROP FUNCTION IF EXISTS deadmans_validate_question_answers_trigger() CASCADE;
                DROP FUNCTION IF EXISTS deadmans_assert_question_answers(uuid) CASCADE;
                DROP FUNCTION IF EXISTS deadmans_validate_quiz_round_trigger() CASCADE;
                DROP FUNCTION IF EXISTS deadmans_validate_quiz_round_update() CASCADE;
                DROP FUNCTION IF EXISTS deadmans_assert_quiz_round(uuid) CASCADE;
                """
            );

            migrationBuilder.DropForeignKey(
                name: "fk_quiz_point_ledger_correct_answer_same_game",
                table: "game_quiz_point_ledger_entries");

            migrationBuilder.DropTable(
                name: "game_quiz_correct_answers");

            migrationBuilder.DropTable(
                name: "question_accepted_answers");

            migrationBuilder.DropIndex(
                name: "ux_game_quiz_rounds_one_open",
                table: "game_quiz_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_quiz_rounds_close_semantics",
                table: "game_quiz_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_quiz_rounds_snapshot",
                table: "game_quiz_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_quiz_rounds_status_allowed",
                table: "game_quiz_rounds");

            migrationBuilder.DropIndex(
                name: "ix_game_quiz_point_ledger_entries_correct_answer_id",
                table: "game_quiz_point_ledger_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_quiz_point_ledger_source_semantics",
                table: "game_quiz_point_ledger_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_enabled_questions_answers_present",
                table: "game_enabled_questions");

            migrationBuilder.DropColumn(
                name: "accepted_answers_snapshot",
                table: "game_quiz_rounds");

            migrationBuilder.DropColumn(
                name: "accepted_answers_snapshot",
                table: "game_enabled_questions");

            migrationBuilder.RenameColumn(
                name: "normalized_answers_snapshot",
                table: "game_quiz_rounds",
                newName: "option_texts_snapshot");

            migrationBuilder.RenameColumn(
                name: "correct_answer_id",
                table: "game_quiz_point_ledger_entries",
                newName: "quiz_submission_id");

            migrationBuilder.RenameIndex(
                name: "ix_game_quiz_point_ledger_entries_game_id_correct_answer_id",
                table: "game_quiz_point_ledger_entries",
                newName: "ix_game_quiz_point_ledger_entries_game_id_quiz_submission_id");

            migrationBuilder.RenameColumn(
                name: "normalized_answers_snapshot",
                table: "game_enabled_questions",
                newName: "option_texts_snapshot");

            migrationBuilder.AddColumn<Guid>(
                name: "correct_option_id_snapshot",
                table: "game_quiz_rounds",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid[]>(
                name: "option_ids_snapshot",
                table: "game_quiz_rounds",
                type: "uuid[]",
                nullable: false,
                defaultValue: new Guid[0]);

            migrationBuilder.AddColumn<Guid>(
                name: "correct_option_id_snapshot",
                table: "game_enabled_questions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid[]>(
                name: "option_ids_snapshot",
                table: "game_enabled_questions",
                type: "uuid[]",
                nullable: false,
                defaultValue: new Guid[0]);

            migrationBuilder.CreateTable(
                name: "game_quiz_submissions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quiz_round_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    captured_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    selected_option_id = table.Column<Guid>(type: "uuid", nullable: false),
                    selected_option_text_snapshot = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    is_correct = table.Column<bool>(type: "boolean", nullable: false),
                    awarded_points = table.Column<int>(type: "integer", nullable: false),
                    twitch_user_id_snapshot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    login_snapshot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    display_name_snapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    source_provider = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    source_channel_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    source_message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    submitted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_quiz_submissions", x => x.id);
                    table.UniqueConstraint("ak_game_quiz_submissions_game_id_id", x => new { x.game_id, x.id });
                    table.CheckConstraint("ck_game_quiz_submissions_award_semantics", "awarded_points >= 0 AND (is_correct = TRUE OR awarded_points = 0)");
                    table.CheckConstraint("ck_game_quiz_submissions_identity_snapshots_not_blank", "length(trim(twitch_user_id_snapshot)) > 0 AND length(trim(login_snapshot)) > 0 AND length(trim(display_name_snapshot)) > 0");
                    table.CheckConstraint("ck_game_quiz_submissions_option_text_not_blank", "length(trim(selected_option_text_snapshot)) > 0");
                    table.CheckConstraint("ck_game_quiz_submissions_source_allowed", "source_provider IN ('manual','web','twitch')");
                    table.CheckConstraint("ck_game_quiz_submissions_source_semantics", "(source_provider IN ('manual','web') AND source_channel_id IS NULL AND source_message_id IS NULL) OR (source_provider = 'twitch' AND source_channel_id IS NOT NULL AND source_message_id IS NOT NULL AND length(trim(source_channel_id)) > 0 AND length(trim(source_message_id)) > 0)");
                    table.ForeignKey(
                        name: "fk_game_quiz_submissions_users_captured_by_user_id",
                        column: x => x.captured_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_quiz_submissions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_quiz_submissions_round_same_game",
                        columns: x => new { x.game_id, x.quiz_round_id },
                        principalTable: "game_quiz_rounds",
                        principalColumns: new[] { "game_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "question_options",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    question_id = table.Column<Guid>(type: "uuid", nullable: false),
                    text = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    normalized_text = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    is_correct = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_question_options", x => x.id);
                    table.UniqueConstraint("ak_question_options_question_id_id", x => new { x.question_id, x.id });
                    table.CheckConstraint("ck_question_options_sort_order_non_negative", "sort_order >= 0");
                    table.CheckConstraint("ck_question_options_text_not_blank", "length(trim(text)) > 0 AND length(trim(normalized_text)) > 0");
                    table.ForeignKey(
                        name: "fk_question_options_question_definitions_question_id",
                        column: x => x.question_id,
                        principalTable: "question_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ux_game_quiz_rounds_one_open",
                table: "game_quiz_rounds",
                column: "game_id",
                unique: true,
                filter: "status = 'open'");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_quiz_rounds_close_semantics",
                table: "game_quiz_rounds",
                sql: "((status = 'open') AND closed_at_utc IS NULL) OR ((status IN ('closed','skipped')) AND closed_at_utc IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_quiz_rounds_snapshot",
                table: "game_quiz_rounds",
                sql: "question_revision_snapshot > 0 AND reward_snapshot >= 0 AND length(trim(question_code_snapshot)) > 0 AND length(trim(category_name_snapshot)) > 0 AND length(trim(question_text_snapshot)) > 0 AND cardinality(option_ids_snapshot) BETWEEN 2 AND 10 AND cardinality(option_ids_snapshot) = cardinality(option_texts_snapshot) AND correct_option_id_snapshot = ANY(option_ids_snapshot)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_quiz_rounds_status_allowed",
                table: "game_quiz_rounds",
                sql: "status IN ('open','closed','skipped')");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_point_ledger_entries_quiz_submission_id",
                table: "game_quiz_point_ledger_entries",
                column: "quiz_submission_id",
                unique: true,
                filter: "quiz_submission_id IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "ck_quiz_point_ledger_source_semantics",
                table: "game_quiz_point_ledger_entries",
                sql: "(entry_type = 'quiz_reward' AND points_delta > 0 AND quiz_submission_id IS NOT NULL AND modifier_activation_id IS NULL AND manual_request_id IS NULL AND created_by_user_id IS NULL AND reason IS NULL) OR (entry_type = 'manual_adjustment' AND quiz_submission_id IS NULL AND modifier_activation_id IS NULL AND manual_request_id IS NOT NULL AND created_by_user_id IS NOT NULL AND reason IS NOT NULL AND length(trim(reason)) BETWEEN 3 AND 500) OR (entry_type = 'modifier_purchase' AND points_delta < 0 AND quiz_submission_id IS NULL AND modifier_activation_id IS NOT NULL AND manual_request_id IS NULL AND created_by_user_id IS NOT NULL AND reason IS NULL) OR (entry_type = 'modifier_refund' AND points_delta > 0 AND quiz_submission_id IS NULL AND modifier_activation_id IS NOT NULL AND manual_request_id IS NULL AND created_by_user_id IS NOT NULL AND (reason IS NULL OR length(trim(reason)) BETWEEN 3 AND 500))");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_enabled_questions_options_present",
                table: "game_enabled_questions",
                sql: "cardinality(option_ids_snapshot) BETWEEN 2 AND 10 AND cardinality(option_ids_snapshot) = cardinality(option_texts_snapshot) AND correct_option_id_snapshot = ANY(option_ids_snapshot)");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_submissions_captured_by_user_id",
                table: "game_quiz_submissions",
                column: "captured_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_submissions_game_id_quiz_round_id",
                table: "game_quiz_submissions",
                columns: new[] { "game_id", "quiz_round_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_submissions_game_id_user_id_submitted_at_utc",
                table: "game_quiz_submissions",
                columns: new[] { "game_id", "user_id", "submitted_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_submissions_quiz_round_id_user_id",
                table: "game_quiz_submissions",
                columns: new[] { "quiz_round_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_submissions_user_id",
                table: "game_quiz_submissions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ux_game_quiz_submissions_source_message",
                table: "game_quiz_submissions",
                columns: new[] { "source_provider", "source_channel_id", "source_message_id" },
                unique: true,
                filter: "source_channel_id IS NOT NULL AND source_message_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_question_options_question_id_normalized_text",
                table: "question_options",
                columns: new[] { "question_id", "normalized_text" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_question_options_question_id_sort_order",
                table: "question_options",
                columns: new[] { "question_id", "sort_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_question_options_text_trgm",
                table: "question_options",
                column: "text")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "ux_question_options_one_correct",
                table: "question_options",
                column: "question_id",
                unique: true,
                filter: "is_correct = TRUE");

            migrationBuilder.AddForeignKey(
                name: "fk_quiz_point_ledger_submission_same_game",
                table: "game_quiz_point_ledger_entries",
                columns: new[] { "game_id", "quiz_submission_id" },
                principalTable: "game_quiz_submissions",
                principalColumns: new[] { "game_id", "id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.Sql(
                """
                CREATE FUNCTION deadmans_assert_question_options(p_question_id uuid)
                RETURNS void
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $function$
                DECLARE
                    option_count bigint;
                    correct_count bigint;
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM question_definitions WHERE id = p_question_id) THEN
                        RETURN;
                    END IF;

                    SELECT count(*), count(*) FILTER (WHERE is_correct)
                    INTO option_count, correct_count
                    FROM question_options
                    WHERE question_id = p_question_id;

                    IF option_count NOT BETWEEN 2 AND 10 OR correct_count <> 1 THEN
                        RAISE EXCEPTION
                            'Question % must have between two and ten options and exactly one correct option.',
                            p_question_id
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_question_options_complete_set';
                    END IF;
                END;
                $function$;

                CREATE FUNCTION deadmans_validate_question_options_trigger()
                RETURNS trigger
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $function$
                DECLARE
                    new_row jsonb := to_jsonb(NEW);
                    old_row jsonb := to_jsonb(OLD);
                    new_question_id uuid;
                    old_question_id uuid;
                BEGIN
                    IF TG_TABLE_NAME = 'question_definitions' THEN
                        IF TG_OP <> 'DELETE' THEN
                            PERFORM deadmans_assert_question_options((new_row ->> 'id')::uuid);
                        END IF;
                    ELSE
                        IF TG_OP <> 'DELETE' THEN
                            new_question_id := (new_row ->> 'question_id')::uuid;
                            PERFORM deadmans_assert_question_options(new_question_id);
                        END IF;
                        IF TG_OP <> 'INSERT' THEN
                            old_question_id := (old_row ->> 'question_id')::uuid;
                        END IF;
                        IF TG_OP <> 'INSERT'
                           AND (TG_OP = 'DELETE' OR old_question_id IS DISTINCT FROM new_question_id) THEN
                            PERFORM deadmans_assert_question_options(old_question_id);
                        END IF;
                    END IF;
                    RETURN NULL;
                END;
                $function$;

                CREATE CONSTRAINT TRIGGER trg_question_definitions_option_set
                    AFTER INSERT OR UPDATE ON question_definitions
                    DEFERRABLE INITIALLY DEFERRED
                    FOR EACH ROW EXECUTE FUNCTION deadmans_validate_question_options_trigger();
                CREATE CONSTRAINT TRIGGER trg_question_options_complete_set
                    AFTER INSERT OR UPDATE OR DELETE ON question_options
                    DEFERRABLE INITIALLY DEFERRED
                    FOR EACH ROW EXECUTE FUNCTION deadmans_validate_question_options_trigger();

                CREATE FUNCTION deadmans_validate_quiz_submission_insert()
                RETURNS trigger
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $function$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM users participant
                        WHERE participant.id = NEW.user_id
                          AND participant.is_active
                          AND participant.twitch_user_id = NEW.twitch_user_id_snapshot
                          AND participant.login = NEW.login_snapshot
                          AND participant.display_name = NEW.display_name_snapshot
                    ) THEN
                        RAISE EXCEPTION 'A quiz submission must preserve the active Twitch principal identity.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_quiz_submissions_principal_snapshot';
                    END IF;
                    RETURN NEW;
                END;
                $function$;

                CREATE TRIGGER trg_game_quiz_submissions_principal_snapshot
                    BEFORE INSERT ON game_quiz_submissions
                    FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_submission_insert();

                CREATE FUNCTION deadmans_assert_quiz_round(p_round_id uuid)
                RETURNS void
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $function$
                DECLARE
                    quiz_round game_quiz_rounds%ROWTYPE;
                    enabled_question game_enabled_questions%ROWTYPE;
                    quiz_game games%ROWTYPE;
                BEGIN
                    SELECT * INTO quiz_round FROM game_quiz_rounds WHERE id = p_round_id;
                    IF NOT FOUND THEN
                        RETURN;
                    END IF;

                    SELECT * INTO enabled_question
                    FROM game_enabled_questions
                    WHERE game_id = quiz_round.game_id
                      AND question_id = quiz_round.question_id;

                    IF NOT FOUND OR ROW(
                        quiz_round.question_revision_snapshot,
                        quiz_round.question_code_snapshot,
                        quiz_round.category_name_snapshot,
                        quiz_round.question_text_snapshot,
                        quiz_round.correct_option_id_snapshot,
                        quiz_round.reward_snapshot
                    ) IS DISTINCT FROM ROW(
                        enabled_question.question_revision_snapshot,
                        enabled_question.question_code_snapshot,
                        enabled_question.category_name_snapshot,
                        enabled_question.question_text_snapshot,
                        enabled_question.correct_option_id_snapshot,
                        enabled_question.reward_snapshot
                    ) OR EXISTS (
                        SELECT 1
                        FROM unnest(
                            quiz_round.option_ids_snapshot,
                            quiz_round.option_texts_snapshot
                        ) AS round_option(id, text)
                        FULL JOIN unnest(
                            enabled_question.option_ids_snapshot,
                            enabled_question.option_texts_snapshot
                        ) AS enabled_option(id, text)
                          ON enabled_option.id = round_option.id
                        WHERE round_option.id IS NULL
                           OR enabled_option.id IS NULL
                           OR round_option.text IS DISTINCT FROM enabled_option.text
                    ) THEN
                        RAISE EXCEPTION 'A quiz round must be a permutation of its game-frozen question snapshot.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_quiz_rounds_enabled_snapshot';
                    END IF;

                    SELECT * INTO quiz_game FROM games WHERE id = quiz_round.game_id;
                    IF NOT FOUND
                       OR quiz_game.status NOT IN ('active', 'finished')
                       OR quiz_game.is_deleted
                       OR quiz_round.asked_at_utc < quiz_game.started_at_utc
                       OR (
                           quiz_game.finished_at_utc IS NOT NULL
                           AND COALESCE(quiz_round.closed_at_utc, quiz_round.closes_at_utc)
                               > quiz_game.finished_at_utc
                       ) THEN
                        RAISE EXCEPTION 'Quiz history must fit inside an active game lifetime.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_quiz_rounds_game_lifetime';
                    END IF;

                    IF quiz_round.closes_at_utc IS DISTINCT FROM
                       quiz_round.asked_at_utc
                           + make_interval(secs => quiz_game.quiz_answer_duration_seconds) THEN
                        RAISE EXCEPTION 'A quiz window must use the game answer duration.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_quiz_rounds_game_duration';
                    END IF;

                    IF quiz_round.status = 'open'
                       AND quiz_game.status <> 'active' THEN
                        RAISE EXCEPTION 'An open quiz round requires an active game.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_quiz_rounds_open_game_active';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM game_quiz_submissions submission
                        WHERE submission.quiz_round_id = quiz_round.id
                          AND (
                              submission.game_id <> quiz_round.game_id
                              OR submission.submitted_at_utc < quiz_round.asked_at_utc
                              OR submission.submitted_at_utc >= quiz_round.closes_at_utc
                              OR NOT submission.selected_option_id = ANY(quiz_round.option_ids_snapshot)
                              OR submission.selected_option_text_snapshot IS DISTINCT FROM
                                  quiz_round.option_texts_snapshot[
                                      array_position(
                                          quiz_round.option_ids_snapshot,
                                          submission.selected_option_id
                                      )
                                  ]
                              OR submission.is_correct IS DISTINCT FROM
                                  (submission.selected_option_id = quiz_round.correct_option_id_snapshot)
                              OR (
                                  quiz_round.status <> 'closed'
                                  AND submission.awarded_points <> 0
                              )
                              OR (
                                  quiz_round.status = 'closed'
                                  AND submission.awarded_points IS DISTINCT FROM
                                      CASE WHEN submission.is_correct THEN quiz_round.reward_snapshot ELSE 0 END
                              )
                          )
                    ) THEN
                        RAISE EXCEPTION 'A quiz submission must match its round, option, deadline and reward.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_quiz_submissions_round_consistency';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM game_quiz_submissions submission
                        LEFT JOIN game_quiz_point_ledger_entries reward
                          ON reward.quiz_submission_id = submission.id
                         AND reward.entry_type = 'quiz_reward'
                        WHERE submission.quiz_round_id = quiz_round.id
                        GROUP BY submission.id, submission.is_correct, submission.awarded_points
                        HAVING (
                            quiz_round.status = 'closed'
                            AND quiz_round.reward_snapshot > 0
                            AND submission.is_correct
                            AND submission.awarded_points = quiz_round.reward_snapshot
                            AND count(reward.id) <> 1
                        ) OR (
                            NOT (
                                quiz_round.status = 'closed'
                                AND quiz_round.reward_snapshot > 0
                                AND submission.is_correct
                                AND submission.awarded_points = quiz_round.reward_snapshot
                            )
                            AND count(reward.id) <> 0
                        )
                    ) THEN
                        RAISE EXCEPTION 'Quiz rewards must match closed correct submissions exactly once.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_quiz_submissions_reward_consistency';
                    END IF;
                END;
                $function$;

                CREATE FUNCTION deadmans_validate_quiz_round_trigger()
                RETURNS trigger
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $function$
                DECLARE
                    affected_round_id uuid;
                    new_row jsonb := to_jsonb(NEW);
                    old_row jsonb := to_jsonb(OLD);
                BEGIN
                    IF TG_TABLE_NAME = 'game_quiz_rounds' THEN
                        affected_round_id := COALESCE(
                            (new_row ->> 'id')::uuid,
                            (old_row ->> 'id')::uuid
                        );
                    ELSIF TG_TABLE_NAME = 'game_quiz_submissions' THEN
                        affected_round_id := COALESCE(
                            (new_row ->> 'quiz_round_id')::uuid,
                            (old_row ->> 'quiz_round_id')::uuid
                        );
                    ELSE
                        SELECT quiz_round_id INTO affected_round_id
                        FROM game_quiz_submissions
                        WHERE id = COALESCE(
                            (new_row ->> 'quiz_submission_id')::uuid,
                            (old_row ->> 'quiz_submission_id')::uuid
                        );
                    END IF;

                    IF affected_round_id IS NOT NULL THEN
                        PERFORM deadmans_assert_quiz_round(affected_round_id);
                    END IF;
                    RETURN NULL;
                END;
                $function$;

                CREATE CONSTRAINT TRIGGER trg_game_quiz_rounds_consistency
                    AFTER INSERT OR UPDATE ON game_quiz_rounds
                    DEFERRABLE INITIALLY DEFERRED
                    FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_round_trigger();
                CREATE CONSTRAINT TRIGGER trg_game_quiz_submissions_consistency
                    AFTER INSERT OR UPDATE ON game_quiz_submissions
                    DEFERRABLE INITIALLY DEFERRED
                    FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_round_trigger();
                CREATE CONSTRAINT TRIGGER trg_game_quiz_rewards_consistency
                    AFTER INSERT ON game_quiz_point_ledger_entries
                    DEFERRABLE INITIALLY DEFERRED
                    FOR EACH ROW
                    WHEN (NEW.quiz_submission_id IS NOT NULL)
                    EXECUTE FUNCTION deadmans_validate_quiz_round_trigger();

                CREATE FUNCTION deadmans_validate_quiz_round_update()
                RETURNS trigger
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $function$
                BEGIN
                    IF OLD.status <> 'open' THEN
                        RAISE EXCEPTION 'A terminal quiz round is immutable.'
                            USING ERRCODE = '55000';
                    END IF;
                    IF ROW(
                        OLD.id, OLD.game_id, OLD.question_id, OLD.ask_order,
                        OLD.asked_at_utc, OLD.closes_at_utc, OLD.asked_by_user_id,
                        OLD.question_revision_snapshot, OLD.question_code_snapshot,
                        OLD.category_name_snapshot, OLD.question_text_snapshot,
                        OLD.option_ids_snapshot, OLD.option_texts_snapshot,
                        OLD.correct_option_id_snapshot, OLD.reward_snapshot,
                        OLD.delivery_kind, OLD.source_channel_id, OLD.source_message_id
                    ) IS DISTINCT FROM ROW(
                        NEW.id, NEW.game_id, NEW.question_id, NEW.ask_order,
                        NEW.asked_at_utc, NEW.closes_at_utc, NEW.asked_by_user_id,
                        NEW.question_revision_snapshot, NEW.question_code_snapshot,
                        NEW.category_name_snapshot, NEW.question_text_snapshot,
                        NEW.option_ids_snapshot, NEW.option_texts_snapshot,
                        NEW.correct_option_id_snapshot, NEW.reward_snapshot,
                        NEW.delivery_kind, NEW.source_channel_id, NEW.source_message_id
                    ) THEN
                        RAISE EXCEPTION 'Quiz round identity, delivery, window and snapshots are immutable.'
                            USING ERRCODE = '55000';
                    END IF;
                    RETURN NEW;
                END;
                $function$;

                CREATE TRIGGER trg_game_quiz_rounds_immutable_snapshot
                    BEFORE UPDATE ON game_quiz_rounds
                    FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_round_update();

                CREATE OR REPLACE FUNCTION deadmans_assert_game_quiz_state()
                RETURNS trigger
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $function$
                BEGIN
                    IF (NEW.status <> 'active' OR NEW.is_deleted)
                       AND EXISTS (
                            SELECT 1 FROM game_quiz_rounds
                            WHERE game_id = NEW.id AND status = 'open'
                       ) THEN
                        RAISE EXCEPTION 'A non-active game cannot retain an open quiz round.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_no_open_quiz_outside_active';
                    END IF;
                    RETURN NULL;
                END;
                $function$;

                DO $migration$
                DECLARE
                    definition text;
                BEGIN
                    SELECT pg_get_functiondef(proc.oid)
                    INTO definition
                    FROM pg_proc proc
                    JOIN pg_namespace namespace ON namespace.oid = proc.pronamespace
                    WHERE namespace.nspname = 'public'
                      AND proc.proname = 'deadmans_assert_game_finalization'
                      AND pg_get_function_identity_arguments(proc.oid) = 'p_game_id uuid';

                    IF definition IS NULL THEN
                        RAISE EXCEPTION 'The game finalization invariant is missing.';
                    END IF;

                    definition := replace(
                        definition,
                        'quiz_round.status = ''asked''',
                        'quiz_round.status = ''open'''
                    );
                    IF definition LIKE '%quiz_round.status = ''asked''%' THEN
                        RAISE EXCEPTION 'Could not upgrade the game finalization invariant.';
                    END IF;
                    EXECUTE definition;
                END
                $migration$;
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // A schema rollback cannot reconstruct the discarded pre-release data,
            // nor represent multiple submissions in the old single-winner model.
            migrationBuilder.Sql(
                """
                DO $migration$
                BEGIN
                    IF EXISTS (SELECT 1 FROM question_definitions)
                       OR EXISTS (SELECT 1 FROM game_enabled_questions)
                       OR EXISTS (SELECT 1 FROM game_quiz_rounds)
                       OR EXISTS (SELECT 1 FROM game_quiz_submissions) THEN
                        RAISE EXCEPTION 'Cannot downgrade populated multiple-choice quiz data. Restore a pre-upgrade backup instead.';
                    END IF;
                END
                $migration$;
                """
            );

            migrationBuilder.Sql(
                """
                DROP FUNCTION IF EXISTS deadmans_validate_quiz_submission_insert() CASCADE;
                DROP FUNCTION IF EXISTS deadmans_validate_question_options_trigger() CASCADE;
                DROP FUNCTION IF EXISTS deadmans_assert_question_options(uuid) CASCADE;
                DROP FUNCTION IF EXISTS deadmans_validate_quiz_round_trigger() CASCADE;
                DROP FUNCTION IF EXISTS deadmans_validate_quiz_round_update() CASCADE;
                DROP FUNCTION IF EXISTS deadmans_assert_quiz_round(uuid) CASCADE;
                """
            );

            migrationBuilder.DropForeignKey(
                name: "fk_quiz_point_ledger_submission_same_game",
                table: "game_quiz_point_ledger_entries");

            migrationBuilder.DropTable(
                name: "game_quiz_submissions");

            migrationBuilder.DropTable(
                name: "question_options");

            migrationBuilder.DropIndex(
                name: "ux_game_quiz_rounds_one_open",
                table: "game_quiz_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_quiz_rounds_close_semantics",
                table: "game_quiz_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_quiz_rounds_snapshot",
                table: "game_quiz_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_quiz_rounds_status_allowed",
                table: "game_quiz_rounds");

            migrationBuilder.DropIndex(
                name: "ix_game_quiz_point_ledger_entries_quiz_submission_id",
                table: "game_quiz_point_ledger_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_quiz_point_ledger_source_semantics",
                table: "game_quiz_point_ledger_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_enabled_questions_options_present",
                table: "game_enabled_questions");

            migrationBuilder.DropColumn(
                name: "correct_option_id_snapshot",
                table: "game_quiz_rounds");

            migrationBuilder.DropColumn(
                name: "option_ids_snapshot",
                table: "game_quiz_rounds");

            migrationBuilder.DropColumn(
                name: "correct_option_id_snapshot",
                table: "game_enabled_questions");

            migrationBuilder.DropColumn(
                name: "option_ids_snapshot",
                table: "game_enabled_questions");

            migrationBuilder.RenameColumn(
                name: "option_texts_snapshot",
                table: "game_quiz_rounds",
                newName: "normalized_answers_snapshot");

            migrationBuilder.RenameColumn(
                name: "quiz_submission_id",
                table: "game_quiz_point_ledger_entries",
                newName: "correct_answer_id");

            migrationBuilder.RenameIndex(
                name: "ix_game_quiz_point_ledger_entries_game_id_quiz_submission_id",
                table: "game_quiz_point_ledger_entries",
                newName: "ix_game_quiz_point_ledger_entries_game_id_correct_answer_id");

            migrationBuilder.RenameColumn(
                name: "option_texts_snapshot",
                table: "game_enabled_questions",
                newName: "normalized_answers_snapshot");

            migrationBuilder.AddColumn<string[]>(
                name: "accepted_answers_snapshot",
                table: "game_quiz_rounds",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);

            migrationBuilder.AddColumn<string[]>(
                name: "accepted_answers_snapshot",
                table: "game_enabled_questions",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);

            migrationBuilder.CreateTable(
                name: "game_quiz_correct_answers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    awarded_to_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    captured_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quiz_round_id = table.Column<Guid>(type: "uuid", nullable: false),
                    answered_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    display_name_snapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    login_snapshot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    normalized_answer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    source_channel_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    source_message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    source_provider = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    submitted_answer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    twitch_user_id_snapshot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_quiz_correct_answers", x => x.id);
                    table.UniqueConstraint("ak_game_quiz_correct_answers_game_id_id", x => new { x.game_id, x.id });
                    table.CheckConstraint("ck_game_quiz_correct_answers_answer_not_blank", "length(trim(submitted_answer)) > 0 AND length(trim(normalized_answer)) > 0");
                    table.CheckConstraint("ck_game_quiz_correct_answers_identity_snapshots_not_blank", "length(trim(twitch_user_id_snapshot)) > 0 AND length(trim(login_snapshot)) > 0 AND length(trim(display_name_snapshot)) > 0");
                    table.CheckConstraint("ck_game_quiz_correct_answers_source_allowed", "source_provider IN ('manual','twitch')");
                    table.CheckConstraint("ck_game_quiz_correct_answers_source_semantics", "(source_provider = 'manual' AND source_channel_id IS NULL AND source_message_id IS NULL) OR (source_provider = 'twitch' AND source_channel_id IS NOT NULL AND source_message_id IS NOT NULL AND length(trim(source_channel_id)) > 0 AND length(trim(source_message_id)) > 0)");
                    table.ForeignKey(
                        name: "fk_game_quiz_correct_answers_users_awarded_to_user_id",
                        column: x => x.awarded_to_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_quiz_correct_answers_users_captured_by_user_id",
                        column: x => x.captured_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_quiz_correct_answers_round_same_game",
                        columns: x => new { x.game_id, x.quiz_round_id },
                        principalTable: "game_quiz_rounds",
                        principalColumns: new[] { "game_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "question_accepted_answers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    question_id = table.Column<Guid>(type: "uuid", nullable: false),
                    answer_text = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    normalized_answer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_question_accepted_answers", x => x.id);
                    table.CheckConstraint("ck_question_accepted_answers_sort_order_non_negative", "sort_order >= 0");
                    table.CheckConstraint("ck_question_accepted_answers_text_not_blank", "length(trim(answer_text)) > 0 AND length(trim(normalized_answer)) > 0");
                    table.ForeignKey(
                        name: "fk_question_accepted_answers_question_definitions_question_id",
                        column: x => x.question_id,
                        principalTable: "question_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ux_game_quiz_rounds_one_open",
                table: "game_quiz_rounds",
                column: "game_id",
                unique: true,
                filter: "status = 'asked'");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_quiz_rounds_close_semantics",
                table: "game_quiz_rounds",
                sql: "((status = 'asked') AND closed_at_utc IS NULL) OR ((status IN ('answered_correct','timeout','skipped')) AND closed_at_utc IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_quiz_rounds_snapshot",
                table: "game_quiz_rounds",
                sql: "question_revision_snapshot > 0 AND reward_snapshot >= 0 AND length(trim(question_code_snapshot)) > 0 AND length(trim(category_name_snapshot)) > 0 AND length(trim(question_text_snapshot)) > 0 AND cardinality(accepted_answers_snapshot) > 0 AND cardinality(accepted_answers_snapshot) = cardinality(normalized_answers_snapshot)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_quiz_rounds_status_allowed",
                table: "game_quiz_rounds",
                sql: "status IN ('asked','answered_correct','timeout','skipped')");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_point_ledger_entries_correct_answer_id",
                table: "game_quiz_point_ledger_entries",
                column: "correct_answer_id",
                unique: true,
                filter: "correct_answer_id IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "ck_quiz_point_ledger_source_semantics",
                table: "game_quiz_point_ledger_entries",
                sql: "(entry_type = 'quiz_reward' AND points_delta > 0 AND correct_answer_id IS NOT NULL AND modifier_activation_id IS NULL AND manual_request_id IS NULL AND created_by_user_id IS NULL AND reason IS NULL) OR (entry_type = 'manual_adjustment' AND correct_answer_id IS NULL AND modifier_activation_id IS NULL AND manual_request_id IS NOT NULL AND created_by_user_id IS NOT NULL AND reason IS NOT NULL AND length(trim(reason)) BETWEEN 3 AND 500) OR (entry_type = 'modifier_purchase' AND points_delta < 0 AND correct_answer_id IS NULL AND modifier_activation_id IS NOT NULL AND manual_request_id IS NULL AND created_by_user_id IS NOT NULL AND reason IS NULL) OR (entry_type = 'modifier_refund' AND points_delta > 0 AND correct_answer_id IS NULL AND modifier_activation_id IS NOT NULL AND manual_request_id IS NULL AND created_by_user_id IS NOT NULL AND (reason IS NULL OR length(trim(reason)) BETWEEN 3 AND 500))");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_enabled_questions_answers_present",
                table: "game_enabled_questions",
                sql: "cardinality(accepted_answers_snapshot) > 0 AND cardinality(accepted_answers_snapshot) = cardinality(normalized_answers_snapshot)");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_correct_answers_awarded_to_user_id",
                table: "game_quiz_correct_answers",
                column: "awarded_to_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_correct_answers_captured_by_user_id",
                table: "game_quiz_correct_answers",
                column: "captured_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_correct_answers_game_id_quiz_round_id",
                table: "game_quiz_correct_answers",
                columns: new[] { "game_id", "quiz_round_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_correct_answers_quiz_round_id",
                table: "game_quiz_correct_answers",
                column: "quiz_round_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_quiz_answers_game_user_time",
                table: "game_quiz_correct_answers",
                columns: new[] { "game_id", "awarded_to_user_id", "answered_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ux_game_quiz_correct_answers_source_message",
                table: "game_quiz_correct_answers",
                columns: new[] { "source_provider", "source_channel_id", "source_message_id" },
                unique: true,
                filter: "source_channel_id IS NOT NULL AND source_message_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_question_accepted_answers_question_id_normalized_answer",
                table: "question_accepted_answers",
                columns: new[] { "question_id", "normalized_answer" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_question_accepted_answers_question_id_sort_order",
                table: "question_accepted_answers",
                columns: new[] { "question_id", "sort_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_question_accepted_answers_text_trgm",
                table: "question_accepted_answers",
                column: "answer_text")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.AddForeignKey(
                name: "fk_quiz_point_ledger_correct_answer_same_game",
                table: "game_quiz_point_ledger_entries",
                columns: new[] { "game_id", "correct_answer_id" },
                principalTable: "game_quiz_correct_answers",
                principalColumns: new[] { "game_id", "id" },
                onDelete: ReferentialAction.Restrict);
            RestorePreviousQuizInvariants(migrationBuilder);
        }
    }
}
