using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations;

/// <inheritdoc />
public partial class HardenQuizSubmissionHistory : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            CREATE FUNCTION deadmans_uuid_array_has_unique_values(p_values uuid[])
            RETURNS boolean
            LANGUAGE sql
            IMMUTABLE
            STRICT
            PARALLEL SAFE
            SET search_path = public, pg_temp
            AS $function$
                SELECT cardinality(p_values) = count(DISTINCT value)
                FROM unnest(p_values) AS item(value);
            $function$;

            ALTER TABLE game_enabled_questions
                ADD CONSTRAINT ck_game_enabled_questions_option_ids_unique
                CHECK (deadmans_uuid_array_has_unique_values(option_ids_snapshot));

            ALTER TABLE game_quiz_question_sessions
                ADD CONSTRAINT ck_game_quiz_question_sessions_option_ids_unique
                CHECK (deadmans_uuid_array_has_unique_values(option_ids_snapshot));

            CREATE FUNCTION deadmans_validate_quiz_submission_update()
            RETURNS trigger
            LANGUAGE plpgsql
            SET search_path = public, pg_temp
            AS $function$
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    RAISE EXCEPTION 'Quiz submissions are immutable and cannot be deleted.'
                        USING ERRCODE = '55000';
                END IF;

                IF ROW(
                    OLD.id, OLD.game_id, OLD.question_session_id, OLD.user_id,
                    OLD.captured_by_user_id, OLD.selected_option_id,
                    OLD.selected_option_text_snapshot, OLD.is_correct,
                    OLD.twitch_user_id_snapshot, OLD.login_snapshot,
                    OLD.display_name_snapshot, OLD.source_provider,
                    OLD.source_channel_id, OLD.source_message_id, OLD.submitted_at_utc
                ) IS DISTINCT FROM ROW(
                    NEW.id, NEW.game_id, NEW.question_session_id, NEW.user_id,
                    NEW.captured_by_user_id, NEW.selected_option_id,
                    NEW.selected_option_text_snapshot, NEW.is_correct,
                    NEW.twitch_user_id_snapshot, NEW.login_snapshot,
                    NEW.display_name_snapshot, NEW.source_provider,
                    NEW.source_channel_id, NEW.source_message_id, NEW.submitted_at_utc
                ) THEN
                    RAISE EXCEPTION 'Quiz submission identity, answer, source and snapshots are immutable.'
                        USING ERRCODE = '55000';
                END IF;

                IF NEW.awarded_points IS DISTINCT FROM OLD.awarded_points
                   AND (
                       OLD.awarded_points <> 0
                       OR NEW.awarded_points < 0
                       OR (NOT OLD.is_correct AND NEW.awarded_points <> 0)
                   ) THEN
                    RAISE EXCEPTION 'Only the initial reward settlement may update quiz submission points.'
                        USING ERRCODE = '55000';
                END IF;

                RETURN NEW;
            END;
            $function$;

            CREATE TRIGGER trg_game_quiz_submissions_immutable
                BEFORE UPDATE OR DELETE ON game_quiz_submissions
                FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_submission_update();
            """
        );
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DROP TRIGGER IF EXISTS trg_game_quiz_submissions_immutable
                ON game_quiz_submissions;
            DROP FUNCTION IF EXISTS deadmans_validate_quiz_submission_update();

            ALTER TABLE game_quiz_question_sessions
                DROP CONSTRAINT IF EXISTS ck_game_quiz_question_sessions_option_ids_unique;
            ALTER TABLE game_enabled_questions
                DROP CONSTRAINT IF EXISTS ck_game_enabled_questions_option_ids_unique;

            DROP FUNCTION IF EXISTS deadmans_uuid_array_has_unique_values(uuid[]);
            """
        );
    }
}
