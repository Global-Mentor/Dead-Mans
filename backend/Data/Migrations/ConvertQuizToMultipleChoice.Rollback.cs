using Microsoft.EntityFrameworkCore.Migrations;

namespace backend.Data.Migrations;

public partial class ConvertQuizToMultipleChoice
{
    // Frozen pre-conversion invariants. Rollback must restore functions and triggers,
    // not just tables, before older application code can use the schema again.
    private static void RestorePreviousQuizInvariants(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            CREATE OR REPLACE FUNCTION deadmans_assert_question_answers(p_question_id uuid)
            RETURNS void
            LANGUAGE plpgsql
            SET search_path = public, pg_temp
            AS $$
            DECLARE
                answer_count bigint;
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM question_definitions WHERE id = p_question_id) THEN
                    RETURN;
                END IF;

                SELECT count(*)
                INTO answer_count
                FROM question_accepted_answers
                WHERE question_id = p_question_id;

                IF answer_count = 0 THEN
                    RAISE EXCEPTION
                        'Question % must have at least one accepted answer.',
                        p_question_id
                        USING ERRCODE = '23514',
                              CONSTRAINT = 'ck_question_accepted_answers_complete_set';
                END IF;
            END;
            $$;

            CREATE OR REPLACE FUNCTION deadmans_validate_question_answers_trigger()
            RETURNS trigger
            LANGUAGE plpgsql
            SET search_path = public, pg_temp
            AS $$
            DECLARE
                new_row jsonb := to_jsonb(NEW);
                old_row jsonb := to_jsonb(OLD);
                new_question_id uuid;
                old_question_id uuid;
            BEGIN
                IF TG_TABLE_NAME = 'question_definitions' THEN
                    IF TG_OP <> 'DELETE' THEN
                        PERFORM deadmans_assert_question_answers((new_row ->> 'id')::uuid);
                    END IF;
                ELSE
                    IF TG_OP <> 'DELETE' THEN
                        new_question_id := (new_row ->> 'question_id')::uuid;
                        PERFORM deadmans_assert_question_answers(new_question_id);
                    END IF;
                    IF TG_OP <> 'INSERT' THEN
                        old_question_id := (old_row ->> 'question_id')::uuid;
                    END IF;
                    IF TG_OP <> 'INSERT'
                       AND (TG_OP = 'DELETE' OR old_question_id IS DISTINCT FROM new_question_id) THEN
                        PERFORM deadmans_assert_question_answers(old_question_id);
                    END IF;
                END IF;
                RETURN NULL;
            END;
            $$;

            CREATE CONSTRAINT TRIGGER trg_question_definitions_answer_set
                AFTER INSERT OR UPDATE ON question_definitions
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW EXECUTE FUNCTION deadmans_validate_question_answers_trigger();
            CREATE CONSTRAINT TRIGGER trg_question_accepted_answers_complete_set
                AFTER INSERT OR UPDATE OR DELETE ON question_accepted_answers
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW EXECUTE FUNCTION deadmans_validate_question_answers_trigger();


            CREATE OR REPLACE FUNCTION deadmans_assert_quiz_round(p_round_id uuid)
            RETURNS void
            LANGUAGE plpgsql
            SET search_path = public, pg_temp
            AS $$
            DECLARE
                quiz_round game_quiz_rounds%ROWTYPE;
                enabled_question game_enabled_questions%ROWTYPE;
                quiz_game games%ROWTYPE;
                correct_answer game_quiz_correct_answers%ROWTYPE;
                has_correct_answer boolean;
                reward_entry_count bigint;
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
                    quiz_round.accepted_answers_snapshot,
                    quiz_round.normalized_answers_snapshot,
                    quiz_round.reward_snapshot
                ) IS DISTINCT FROM ROW(
                    enabled_question.question_revision_snapshot,
                    enabled_question.question_code_snapshot,
                    enabled_question.category_name_snapshot,
                    enabled_question.question_text_snapshot,
                    enabled_question.accepted_answers_snapshot,
                    enabled_question.normalized_answers_snapshot,
                    enabled_question.reward_snapshot
                ) THEN
                    RAISE EXCEPTION 'An asked question must match the game-frozen question snapshot.'
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

                SELECT * INTO correct_answer
                FROM game_quiz_correct_answers
                WHERE quiz_round_id = p_round_id;
                has_correct_answer := FOUND;

                IF quiz_round.status = 'asked' AND NOT EXISTS (
                    SELECT 1 FROM games
                    WHERE id = quiz_round.game_id AND status = 'active' AND is_deleted = FALSE
                ) THEN
                    RAISE EXCEPTION 'An open quiz round requires an active game.'
                        USING ERRCODE = '23514',
                              CONSTRAINT = 'ck_game_quiz_rounds_open_game_active';
                END IF;

                IF quiz_round.status = 'answered_correct' THEN
                    IF NOT has_correct_answer THEN
                        RAISE EXCEPTION 'A correctly answered quiz round requires its winner fact.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_quiz_rounds_winner_required';
                    END IF;
                    IF correct_answer.answered_at_utc < quiz_round.asked_at_utc
                       OR correct_answer.answered_at_utc >= quiz_round.closes_at_utc
                       OR quiz_round.closed_at_utc IS DISTINCT FROM correct_answer.answered_at_utc
                       OR NOT (
                            correct_answer.normalized_answer
                            = ANY(quiz_round.normalized_answers_snapshot)
                       ) THEN
                        RAISE EXCEPTION 'The quiz winner must match the frozen answer set and window.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_quiz_correct_answers_round_consistency';
                    END IF;

                    SELECT count(*) INTO reward_entry_count
                    FROM game_quiz_point_ledger_entries
                    WHERE correct_answer_id = correct_answer.id
                      AND entry_type = 'quiz_reward';

                    IF quiz_round.reward_snapshot > 0 THEN
                        IF reward_entry_count <> 1 OR NOT EXISTS (
                            SELECT 1
                            FROM game_quiz_point_ledger_entries reward
                            WHERE reward.correct_answer_id = correct_answer.id
                              AND reward.entry_type = 'quiz_reward'
                              AND reward.game_id = quiz_round.game_id
                              AND reward.user_id = correct_answer.awarded_to_user_id
                              AND reward.points_delta = quiz_round.reward_snapshot
                              AND reward.occurred_at_utc = correct_answer.answered_at_utc
                        ) THEN
                            RAISE EXCEPTION 'The quiz winner reward ledger entry is missing or invalid.'
                                USING ERRCODE = '23514',
                                      CONSTRAINT = 'ck_game_quiz_correct_answers_reward_consistency';
                        END IF;
                    ELSIF reward_entry_count <> 0 THEN
                        RAISE EXCEPTION 'A zero-reward quiz round cannot create a reward entry.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_quiz_correct_answers_zero_reward';
                    END IF;
                ELSIF has_correct_answer THEN
                    RAISE EXCEPTION 'Only an answered_correct quiz round may have a winner fact.'
                        USING ERRCODE = '23514',
                              CONSTRAINT = 'ck_game_quiz_correct_answers_terminal_state';
                END IF;
            END;
            $$;

            CREATE OR REPLACE FUNCTION deadmans_validate_quiz_round_trigger()
            RETURNS trigger
            LANGUAGE plpgsql
            SET search_path = public, pg_temp
            AS $$
            DECLARE
                affected_round_id uuid;
                new_row jsonb := to_jsonb(NEW);
            BEGIN
                IF TG_TABLE_NAME = 'game_quiz_rounds' THEN
                    affected_round_id := (new_row ->> 'id')::uuid;
                ELSIF TG_TABLE_NAME = 'game_quiz_correct_answers' THEN
                    affected_round_id := (new_row ->> 'quiz_round_id')::uuid;
                ELSE
                    SELECT quiz_round_id INTO affected_round_id
                    FROM game_quiz_correct_answers
                    WHERE id = (new_row ->> 'correct_answer_id')::uuid;
                END IF;

                IF affected_round_id IS NOT NULL THEN
                    PERFORM deadmans_assert_quiz_round(affected_round_id);
                END IF;
                RETURN NULL;
            END;
            $$;

            CREATE CONSTRAINT TRIGGER trg_game_quiz_rounds_consistency
                AFTER INSERT OR UPDATE ON game_quiz_rounds
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_round_trigger();
            CREATE CONSTRAINT TRIGGER trg_game_quiz_correct_answers_consistency
                AFTER INSERT ON game_quiz_correct_answers
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_round_trigger();
            CREATE CONSTRAINT TRIGGER trg_game_quiz_reward_consistency
                AFTER INSERT ON game_quiz_point_ledger_entries
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW
                WHEN (NEW.correct_answer_id IS NOT NULL)
                EXECUTE FUNCTION deadmans_validate_quiz_round_trigger();

            CREATE OR REPLACE FUNCTION deadmans_validate_quiz_round_update()
            RETURNS trigger
            LANGUAGE plpgsql
            SET search_path = public, pg_temp
            AS $$
            BEGIN
                IF OLD.status <> 'asked' THEN
                    RAISE EXCEPTION 'A terminal quiz round is immutable.'
                        USING ERRCODE = '55000';
                END IF;
                IF ROW(
                    OLD.id, OLD.game_id, OLD.question_id, OLD.ask_order,
                    OLD.asked_at_utc, OLD.closes_at_utc, OLD.asked_by_user_id,
                    OLD.question_revision_snapshot, OLD.question_code_snapshot,
                    OLD.category_name_snapshot, OLD.question_text_snapshot,
                    OLD.accepted_answers_snapshot, OLD.normalized_answers_snapshot,
                    OLD.reward_snapshot, OLD.delivery_kind, OLD.source_channel_id,
                    OLD.source_message_id
                ) IS DISTINCT FROM ROW(
                    NEW.id, NEW.game_id, NEW.question_id, NEW.ask_order,
                    NEW.asked_at_utc, NEW.closes_at_utc, NEW.asked_by_user_id,
                    NEW.question_revision_snapshot, NEW.question_code_snapshot,
                    NEW.category_name_snapshot, NEW.question_text_snapshot,
                    NEW.accepted_answers_snapshot, NEW.normalized_answers_snapshot,
                    NEW.reward_snapshot, NEW.delivery_kind, NEW.source_channel_id,
                    NEW.source_message_id
                ) THEN
                    RAISE EXCEPTION 'Quiz round identity, delivery, window and snapshots are immutable.'
                        USING ERRCODE = '55000';
                END IF;
                RETURN NEW;
            END;
            $$;

            CREATE TRIGGER trg_game_quiz_rounds_immutable_snapshot
                BEFORE UPDATE ON game_quiz_rounds
                FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_round_update();


            CREATE OR REPLACE FUNCTION deadmans_assert_game_publication(p_game_id uuid)
            RETURNS void
            LANGUAGE plpgsql
            SET search_path = public, pg_temp
            AS $$
            DECLARE
                published_game games%ROWTYPE;
            BEGIN
                SELECT * INTO published_game FROM games WHERE id = p_game_id;
                IF NOT FOUND OR published_game.status = 'draft' THEN
                    RETURN;
                END IF;

                IF published_game.ready_at_utc IS NULL THEN
                    RAISE EXCEPTION 'A published game requires its publication timestamp.'
                        USING ERRCODE = '23514',
                              CONSTRAINT = 'ck_games_publication_timestamp_required';
                END IF;

                IF (SELECT count(*) FROM game_boards board WHERE board.game_id = p_game_id) <> 1
                   OR NOT EXISTS (
                       SELECT 1 FROM game_team_slots slot WHERE slot.game_id = p_game_id
                   ) THEN
                    RAISE EXCEPTION 'A published game requires exactly one board and at least one team slot.'
                        USING ERRCODE = '23514',
                              CONSTRAINT = 'ck_games_publication_setup_complete';
                END IF;

                IF published_game.status = 'ready' AND EXISTS (
                    SELECT 1
                    FROM game_board_cells cell
                    JOIN game_boards board ON board.id = cell.board_id
                    WHERE board.game_id = p_game_id
                      AND cell.state <> 'closed'
                ) THEN
                    RAISE EXCEPTION 'Every board cell must be closed when a game is published.'
                        USING ERRCODE = '23514',
                              CONSTRAINT = 'ck_games_publication_cells_closed';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM game_enabled_modifiers enabled
                    JOIN modifier_definitions definition
                      ON definition.id = enabled.modifier_id
                    LEFT JOIN modifier_definition_versions version
                      ON version.id = enabled.modifier_version_id
                     AND version.modifier_id = enabled.modifier_id
                    WHERE enabled.game_id = p_game_id
                      AND (
                          enabled.modifier_version_id IS NULL
                          OR (published_game.status = 'ready' AND definition.is_archived)
                          OR enabled.version_pinned_at_utc IS DISTINCT FROM published_game.ready_at_utc
                          OR enabled.enabled_at_utc > published_game.ready_at_utc
                          OR version.id IS NULL
                          OR version.created_at_utc > published_game.ready_at_utc
                          OR version.revision <> (
                              SELECT max(candidate.revision)
                              FROM modifier_definition_versions candidate
                              WHERE candidate.modifier_id = enabled.modifier_id
                                AND candidate.created_at_utc <= published_game.ready_at_utc
                          )
                      )
                ) THEN
                    RAISE EXCEPTION 'Every published modifier must be pinned at publication.'
                        USING ERRCODE = '23514',
                              CONSTRAINT = 'ck_game_enabled_modifiers_published_pin';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM game_enabled_questions enabled
                    JOIN question_definitions question ON question.id = enabled.question_id
                    JOIN question_categories category ON category.id = question.category_id
                    LEFT JOIN LATERAL (
                        SELECT
                            array_agg(answer.answer_text::text ORDER BY answer.is_primary DESC, answer.sort_order) AS accepted,
                            array_agg(answer.normalized_answer::text ORDER BY answer.is_primary DESC, answer.sort_order) AS normalized
                        FROM question_accepted_answers answer
                        WHERE answer.question_id = question.id
                    ) answers ON TRUE
                    WHERE enabled.game_id = p_game_id
                      AND (
                          enabled.snapshot_at_utc IS DISTINCT FROM published_game.ready_at_utc
                          OR enabled.enabled_at_utc > published_game.ready_at_utc
                          OR (
                              published_game.status = 'ready'
                              AND (
                                  question.is_deleted
                                  OR NOT question.is_enabled
                                  OR enabled.question_revision_snapshot <> question.revision
                                  OR enabled.question_code_snapshot IS DISTINCT FROM question.external_code::text
                                  OR enabled.category_name_snapshot IS DISTINCT FROM category.name::text
                                  OR enabled.question_text_snapshot IS DISTINCT FROM question.text
                                  OR enabled.accepted_answers_snapshot IS DISTINCT FROM answers.accepted
                                  OR enabled.normalized_answers_snapshot IS DISTINCT FROM answers.normalized
                                  OR enabled.reward_snapshot <> question.reward
                                  OR enabled.priority_snapshot <> question.priority
                              )
                          )
                      )
                ) THEN
                    RAISE EXCEPTION 'Every published question must exactly match its source at publication.'
                        USING ERRCODE = '23514',
                              CONSTRAINT = 'ck_game_enabled_questions_published_snapshot';
                END IF;
            END;
            $$;


            CREATE OR REPLACE FUNCTION deadmans_assert_game_quiz_state()
            RETURNS trigger
            LANGUAGE plpgsql
            SET search_path = public, pg_temp
            AS $$
            BEGIN
                IF (NEW.status <> 'active' OR NEW.is_deleted)
                   AND EXISTS (
                        SELECT 1 FROM game_quiz_rounds
                        WHERE game_id = NEW.id AND status = 'asked'
                   ) THEN
                    RAISE EXCEPTION 'A non-active game cannot retain an open quiz round.'
                        USING ERRCODE = '23514',
                              CONSTRAINT = 'ck_games_no_open_quiz_outside_active';
                END IF;
                RETURN NULL;
            END;
            $$;


            CREATE TRIGGER trg_game_quiz_correct_answers_immutable
                BEFORE UPDATE OR DELETE ON game_quiz_correct_answers
                FOR EACH ROW EXECUTE FUNCTION deadmans_reject_immutable_change();
            CREATE TRIGGER trg_game_quiz_correct_answers_principal_snapshot
                BEFORE INSERT ON game_quiz_correct_answers
                FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_answer_principal();
            DO $rollback$
            DECLARE definition text;
            BEGIN
                SELECT pg_get_functiondef(proc.oid) INTO definition
                FROM pg_proc proc JOIN pg_namespace ns ON ns.oid = proc.pronamespace
                WHERE ns.nspname = 'public' AND proc.proname = 'deadmans_assert_game_finalization'
                  AND pg_get_function_identity_arguments(proc.oid) = 'p_game_id uuid';
                IF definition IS NULL THEN RAISE EXCEPTION 'The game finalization invariant is missing.'; END IF;
                EXECUTE replace(definition, 'quiz_round.status = ''open''', 'quiz_round.status = ''asked''');
            END
            $rollback$;
            """);
    }
}
