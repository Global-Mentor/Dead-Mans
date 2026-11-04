using Microsoft.EntityFrameworkCore.Migrations;

namespace backend.Data.Migrations;

public partial class AddManualScreenshotQuestions
{
    private static void ConfigureManualScreenshots(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            INSERT INTO question_categories (id, name, format, created_at_utc, updated_at_utc)
            VALUES ('00000000-0000-0000-0000-000000000003', '__locations_' || gen_random_uuid()::text, 'screenshot', now(), now());
            UPDATE question_definitions SET category_id = '00000000-0000-0000-0000-000000000003'
                WHERE image_snapshot_json IS NOT NULL;
            DELETE FROM question_categories WHERE format = 'screenshot' AND name = 'Локации'
                AND id <> '00000000-0000-0000-0000-000000000003';
            UPDATE question_categories SET name = 'Локации' WHERE id = '00000000-0000-0000-0000-000000000003';

            CREATE OR REPLACE FUNCTION deadmans_validate_quiz_image()
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
                IF NOT EXISTS (SELECT 1 FROM question_screenshots WHERE media_asset_id = (image ->> 'MediaAssetId')::uuid) THEN
                    RAISE EXCEPTION 'Screenshot must reference retained media.' USING ERRCODE = '23514';
                END IF;
                IF EXISTS (SELECT 1 FROM question_screenshots WHERE media_asset_id = (image ->> 'MediaAssetId')::uuid AND location_id IS NULL) THEN
                    IF jsonb_typeof(image) <> 'object' OR COALESCE(cardinality(ids), 0) NOT BETWEEN 2 AND 10
                        OR image -> 'MapNames' IS DISTINCT FROM '{}'::jsonb
                        OR image -> 'OptionNames' IS DISTINCT FROM '{}'::jsonb THEN
                        RAISE EXCEPTION 'Manual screenshots require ordinary answer texts without location translations.' USING ERRCODE = '23514';
                    END IF;
                    RETURN NULL;
                END IF;
                IF jsonb_typeof(image) <> 'object' OR COALESCE(cardinality(ids), 0) <> 6
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

            CREATE OR REPLACE FUNCTION deadmans_protect_screenshot_options()
            RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
            BEGIN
                IF EXISTS (SELECT 1 FROM question_screenshots WHERE question_id = OLD.question_id AND location_id IS NOT NULL) THEN
                    RAISE EXCEPTION 'Screenshot options are immutable.' USING ERRCODE = '55000';
                END IF;
                IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
                RETURN NEW;
            END $function$;

            CREATE OR REPLACE FUNCTION deadmans_assert_question_options(p_question_id uuid)
                RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
                DECLARE option_count bigint; correct_count bigint; image jsonb;
                BEGIN
                    SELECT image_snapshot_json INTO image FROM question_definitions WHERE id = p_question_id;
                    IF NOT FOUND THEN RETURN; END IF;

                    SELECT count(*), count(*) FILTER (WHERE is_correct)
                    INTO option_count, correct_count FROM question_options WHERE question_id = p_question_id;
                    IF option_count NOT BETWEEN 2 AND 10 OR correct_count <> 1 THEN
                        RAISE EXCEPTION 'Question % must have between two and ten options and exactly one correct option.', p_question_id
                            USING ERRCODE = '23514', CONSTRAINT = 'ck_question_options_complete_set';
                    END IF;

                    IF EXISTS (SELECT 1 FROM question_screenshots WHERE question_id = p_question_id AND location_id IS NOT NULL) AND (option_count <> 6
                        OR EXISTS (SELECT 1 FROM question_options WHERE question_id = p_question_id
                            AND NOT (image -> 'OptionNames' ? id::text))) THEN
                        RAISE EXCEPTION 'Screenshot options must match the six retained choices.'
                            USING ERRCODE = '23514', CONSTRAINT = 'ck_screenshot_options_complete_set';
                    END IF;
                END $function$;

            CREATE OR REPLACE FUNCTION deadmans_validate_question_category_format()
            RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
            BEGIN
                IF TG_TABLE_NAME = 'question_categories' THEN
                    IF OLD.format IS DISTINCT FROM NEW.format THEN
                        RAISE EXCEPTION 'Category format is immutable.' USING ERRCODE = '23514',
                            CONSTRAINT = 'ck_question_categories_format_immutable';
                    END IF;
                ELSIF NOT EXISTS (SELECT 1 FROM question_categories category
                    WHERE category.id = NEW.category_id
                        AND category.format = CASE WHEN NEW.image_snapshot_json IS NULL THEN 'text' ELSE 'screenshot' END) THEN
                    RAISE EXCEPTION 'Question and category formats must match.' USING ERRCODE = '23514',
                        CONSTRAINT = 'ck_question_definitions_category_format';
                END IF;
                IF TG_TABLE_NAME = 'question_definitions' THEN
                    IF NEW.image_snapshot_json IS NOT NULL AND
                        ((NEW.category_id = '00000000-0000-0000-0000-000000000003'::uuid)
                        IS DISTINCT FROM (NEW.image_snapshot_json -> 'MapNames' <> '{}'::jsonb)) THEN
                        RAISE EXCEPTION 'Screenshot category and answer mode must match.' USING ERRCODE = '23514',
                            CONSTRAINT = 'ck_question_definitions_screenshot_category';
                    END IF;
                END IF;
                RETURN NEW;
            END $function$;
            """);
    }
    private static void RestoreLocationOnlyScreenshots(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DO $migration$
            BEGIN
                IF EXISTS (SELECT 1 FROM question_screenshots) THEN
                    RAISE EXCEPTION 'Cannot downgrade consolidated screenshot categories. Restore a pre-upgrade backup.' USING ERRCODE = '23514';
                END IF;
            END $migration$;
            DELETE FROM question_categories WHERE id = '00000000-0000-0000-0000-000000000003';

            CREATE OR REPLACE FUNCTION deadmans_validate_quiz_image()
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

            CREATE OR REPLACE FUNCTION deadmans_protect_screenshot_options()
            RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
            BEGIN
                IF EXISTS (SELECT 1 FROM question_screenshots WHERE question_id = OLD.question_id) THEN
                    RAISE EXCEPTION 'Screenshot options are immutable.' USING ERRCODE = '55000';
                END IF;
                IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
                RETURN NEW;
            END $function$;

            CREATE OR REPLACE FUNCTION deadmans_assert_question_options(p_question_id uuid)
                RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
                DECLARE option_count bigint; correct_count bigint; image jsonb;
                BEGIN
                    SELECT image_snapshot_json INTO image FROM question_definitions WHERE id = p_question_id;
                    IF NOT FOUND THEN RETURN; END IF;

                    SELECT count(*), count(*) FILTER (WHERE is_correct)
                    INTO option_count, correct_count FROM question_options WHERE question_id = p_question_id;
                    IF option_count NOT BETWEEN 2 AND 10 OR correct_count <> 1 THEN
                        RAISE EXCEPTION 'Question % must have between two and ten options and exactly one correct option.', p_question_id
                            USING ERRCODE = '23514', CONSTRAINT = 'ck_question_options_complete_set';
                    END IF;

                    IF image IS NOT NULL AND (option_count <> 6
                        OR EXISTS (SELECT 1 FROM question_options WHERE question_id = p_question_id
                            AND NOT (image -> 'OptionNames' ? id::text))) THEN
                        RAISE EXCEPTION 'Screenshot options must match the six retained choices.'
                            USING ERRCODE = '23514', CONSTRAINT = 'ck_screenshot_options_complete_set';
                    END IF;
                END $function$;

            CREATE OR REPLACE FUNCTION deadmans_validate_question_category_format()
            RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
            BEGIN
                IF TG_TABLE_NAME = 'question_categories' THEN
                    IF OLD.format IS DISTINCT FROM NEW.format THEN
                        RAISE EXCEPTION 'Category format is immutable.' USING ERRCODE = '23514',
                            CONSTRAINT = 'ck_question_categories_format_immutable';
                    END IF;
                ELSIF NOT EXISTS (SELECT 1 FROM question_categories category
                    WHERE category.id = NEW.category_id
                        AND category.format = CASE WHEN NEW.image_snapshot_json IS NULL THEN 'text' ELSE 'screenshot' END) THEN
                    RAISE EXCEPTION 'Question and category formats must match.' USING ERRCODE = '23514',
                        CONSTRAINT = 'ck_question_definitions_category_format';
                END IF;
                RETURN NEW;
            END $function$;
            """);
    }
}
