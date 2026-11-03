using Microsoft.EntityFrameworkCore.Migrations;

namespace backend.Data.Migrations;

public partial class AddScreenshotQuiz
{
    private static void AddScreenshotInvariants(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DO $migration$
            DECLARE definition text;
            BEGIN
                definition := pg_get_functiondef('deadmans_assert_quiz_question_session(uuid)'::regprocedure);
                IF position('quiz_game.quiz_answer_duration_seconds' IN definition) = 0 THEN
                    RAISE EXCEPTION 'Expected quiz duration invariant is missing.';
                END IF;
                definition := replace(definition, 'quiz_game.quiz_answer_duration_seconds',
                    '(CASE WHEN quiz_round.image_snapshot_json IS NULL THEN quiz_game.quiz_answer_duration_seconds ELSE quiz_game.screenshot_answer_duration_seconds END)');
                EXECUTE definition;
            END $migration$;

            CREATE FUNCTION deadmans_protect_screenshot_configuration()
            RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
            BEGIN
                IF TG_TABLE_NAME = 'games' THEN
                    IF OLD.status <> 'draft' AND OLD.screenshot_answer_duration_seconds IS DISTINCT FROM NEW.screenshot_answer_duration_seconds THEN
                        RAISE EXCEPTION 'Published screenshot duration is immutable.' USING ERRCODE = '55000';
                    END IF;
                ELSIF TG_TABLE_NAME = 'media_assets' THEN
                    IF EXISTS (SELECT 1 FROM question_screenshots WHERE media_asset_id = OLD.id) THEN
                        RAISE EXCEPTION 'Quiz screenshot media is immutable.' USING ERRCODE = '55000';
                    END IF;
                ELSIF OLD.image_snapshot_json IS DISTINCT FROM NEW.image_snapshot_json THEN
                    RAISE EXCEPTION 'Quiz image snapshots are immutable.' USING ERRCODE = '55000';
                END IF;
                RETURN NEW;
            END $function$;

            CREATE TRIGGER trg_games_screenshot_duration BEFORE UPDATE ON games
                FOR EACH ROW EXECUTE FUNCTION deadmans_protect_screenshot_configuration();
            CREATE TRIGGER trg_media_assets_screenshot BEFORE UPDATE ON media_assets
                FOR EACH ROW EXECUTE FUNCTION deadmans_protect_screenshot_configuration();
            CREATE TRIGGER trg_question_definitions_screenshot BEFORE UPDATE ON question_definitions
                FOR EACH ROW EXECUTE FUNCTION deadmans_protect_screenshot_configuration();
            CREATE TRIGGER trg_quiz_sessions_screenshot BEFORE UPDATE ON game_quiz_question_sessions
                FOR EACH ROW EXECUTE FUNCTION deadmans_protect_screenshot_configuration();
            CREATE TRIGGER trg_twitch_publications_screenshot BEFORE UPDATE ON twitch_quiz_publications
                FOR EACH ROW EXECUTE FUNCTION deadmans_protect_screenshot_configuration();
            CREATE TRIGGER trg_question_screenshots_immutable BEFORE UPDATE OR DELETE ON question_screenshots
                FOR EACH ROW EXECUTE FUNCTION deadmans_reject_immutable_change();

            CREATE FUNCTION deadmans_protect_screenshot_options()
            RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
            BEGIN
                IF EXISTS (SELECT 1 FROM question_screenshots WHERE question_id = OLD.question_id) THEN
                    RAISE EXCEPTION 'Screenshot options are immutable.' USING ERRCODE = '55000';
                END IF;
                IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
                RETURN NEW;
            END $function$;
            CREATE TRIGGER trg_question_options_screenshot BEFORE UPDATE OR DELETE ON question_options
                FOR EACH ROW EXECUTE FUNCTION deadmans_protect_screenshot_options();

            CREATE FUNCTION deadmans_validate_quiz_presentation()
            RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM game_quiz_question_sessions session
                    JOIN games game ON game.id = session.game_id
                    WHERE session.id = NEW.question_session_id AND session.game_id = NEW.game_id
                        AND session.image_snapshot_json IS NOT NULL AND game.status = 'active' AND NOT game.is_deleted) THEN
                    RAISE EXCEPTION 'A screenshot presentation requires a visual session in an active game.' USING ERRCODE = '23514';
                END IF;
                RETURN NULL;
            END $function$;
            CREATE CONSTRAINT TRIGGER trg_quiz_presentation_consistency AFTER INSERT OR UPDATE ON game_quiz_presentations
                DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_presentation();

            CREATE FUNCTION deadmans_validate_quiz_image()
            RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
            DECLARE expected jsonb; image jsonb; ids uuid[]; option_id uuid; locale text;
            BEGIN
                image := NEW.image_snapshot_json;
                IF TG_TABLE_NAME = 'game_quiz_question_sessions' OR TG_TABLE_NAME = 'twitch_quiz_publications' THEN
                    SELECT image_snapshot_json INTO expected FROM game_enabled_questions
                        WHERE game_id = NEW.game_id AND question_id = NEW.question_id;
                    IF image IS DISTINCT FROM expected THEN
                        RAISE EXCEPTION 'Quiz image must match the game snapshot.' USING ERRCODE = '23514';
                    END IF;
                    ids := NEW.option_ids_snapshot;
                ELSIF TG_TABLE_NAME = 'game_enabled_questions' THEN
                    IF EXISTS (SELECT 1 FROM games WHERE id = NEW.game_id AND status IN ('draft', 'ready')) THEN
                        SELECT image_snapshot_json INTO expected FROM question_definitions WHERE id = NEW.question_id;
                        IF image IS DISTINCT FROM expected THEN
                            RAISE EXCEPTION 'Published quiz image must match its definition.' USING ERRCODE = '23514';
                        END IF;
                    END IF;
                    ids := NEW.option_ids_snapshot;
                ELSE
                    SELECT array_agg(id) INTO ids FROM question_options WHERE question_id = NEW.id;
                    IF image IS NOT NULL AND NOT EXISTS (SELECT 1 FROM question_screenshots
                        WHERE question_id = NEW.id AND media_asset_id = (image ->> 'MediaAssetId')::uuid) THEN
                        RAISE EXCEPTION 'Screenshot must reference its own retained media.' USING ERRCODE = '23514';
                    END IF;
                END IF;
                IF image IS NULL THEN RETURN NULL; END IF;
                IF NOT EXISTS (SELECT 1 FROM media_assets WHERE id = (image ->> 'MediaAssetId')::uuid
                    AND bucket || '/' || object_key = image ->> 'MediaPath') THEN
                    RAISE EXCEPTION 'Screenshot media path must match its retained asset.' USING ERRCODE = '23514';
                END IF;
                IF jsonb_typeof(image) <> 'object' OR cardinality(ids) <> 6
                    OR jsonb_typeof(image -> 'OptionNames') IS DISTINCT FROM 'object'
                    OR (SELECT count(*) FROM jsonb_object_keys(image -> 'OptionNames')) <> 6
                    OR NOT EXISTS (SELECT 1 FROM question_screenshots WHERE media_asset_id = (image ->> 'MediaAssetId')::uuid)
                THEN RAISE EXCEPTION 'Invalid screenshot snapshot.' USING ERRCODE = '23514'; END IF;
                FOREACH locale IN ARRAY ARRAY['en', 'ru', 'uk', 'pl'] LOOP
                    IF COALESCE(length(btrim(image -> 'MapNames' ->> locale)), 0) = 0 THEN
                        RAISE EXCEPTION 'Missing screenshot map translation.' USING ERRCODE = '23514';
                    END IF;
                    FOREACH option_id IN ARRAY ids LOOP
                        IF COALESCE(length(btrim(image -> 'OptionNames' -> option_id::text ->> locale)), 0) = 0 THEN
                            RAISE EXCEPTION 'Missing screenshot option translation.' USING ERRCODE = '23514';
                        END IF;
                    END LOOP;
                END LOOP;
                RETURN NULL;
            END $function$;
            CREATE CONSTRAINT TRIGGER trg_question_image_consistency AFTER INSERT OR UPDATE ON question_definitions
                DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_image();
            CREATE CONSTRAINT TRIGGER trg_enabled_question_image_consistency AFTER INSERT OR UPDATE ON game_enabled_questions
                DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_image();
            CREATE CONSTRAINT TRIGGER trg_session_image_consistency AFTER INSERT OR UPDATE ON game_quiz_question_sessions
                DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_image();
            CREATE CONSTRAINT TRIGGER trg_publication_image_consistency AFTER INSERT OR UPDATE ON twitch_quiz_publications
                DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION deadmans_validate_quiz_image();
            """);
    }

    private static void RemoveScreenshotInvariants(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DO $migration$
            BEGIN
                IF EXISTS (SELECT 1 FROM question_screenshots) THEN
                    RAISE EXCEPTION 'Cannot downgrade a populated screenshot catalogue. Restore a pre-upgrade backup.';
                END IF;
            END $migration$;
            DROP TRIGGER trg_quiz_presentation_consistency ON game_quiz_presentations;
            DROP FUNCTION deadmans_validate_quiz_presentation();
            DROP TRIGGER trg_question_options_screenshot ON question_options;
            DROP FUNCTION deadmans_protect_screenshot_options();
            DROP TRIGGER trg_question_image_consistency ON question_definitions;
            DROP TRIGGER trg_enabled_question_image_consistency ON game_enabled_questions;
            DROP TRIGGER trg_session_image_consistency ON game_quiz_question_sessions;
            DROP TRIGGER trg_publication_image_consistency ON twitch_quiz_publications;
            DROP FUNCTION deadmans_validate_quiz_image();
            DROP TRIGGER trg_games_screenshot_duration ON games;
            DROP TRIGGER trg_media_assets_screenshot ON media_assets;
            DROP TRIGGER trg_question_definitions_screenshot ON question_definitions;
            DROP TRIGGER trg_quiz_sessions_screenshot ON game_quiz_question_sessions;
            DROP TRIGGER trg_twitch_publications_screenshot ON twitch_quiz_publications;
            DROP TRIGGER trg_question_screenshots_immutable ON question_screenshots;
            DROP FUNCTION deadmans_protect_screenshot_configuration();
            DO $migration$
            DECLARE definition text;
            BEGIN
                definition := pg_get_functiondef('deadmans_assert_quiz_question_session(uuid)'::regprocedure);
                definition := replace(definition,
                    '(CASE WHEN quiz_round.image_snapshot_json IS NULL THEN quiz_game.quiz_answer_duration_seconds ELSE quiz_game.screenshot_answer_duration_seconds END)',
                    'quiz_game.quiz_answer_duration_seconds');
                EXECUTE definition;
            END $migration$;
            """);
    }
}
