using Microsoft.EntityFrameworkCore.Migrations;

namespace backend.Data.Migrations;

public partial class SeparateScreenshotCategories
{
    private static void SeparateExistingCategories(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            INSERT INTO question_categories (id, name, format, created_at_utc, updated_at_utc)
            VALUES ('00000000-0000-0000-0000-000000000002', 'БЕЗ КАТЕГОРИИ', 'screenshot', now(), now());

            INSERT INTO question_categories (id, name, format, created_at_utc, updated_at_utc)
            SELECT gen_random_uuid(), category.name, 'screenshot', category.created_at_utc, category.updated_at_utc
            FROM question_categories category
            WHERE category.format = 'text'
                AND category.name <> 'БЕЗ КАТЕГОРИИ'
                AND EXISTS (SELECT 1 FROM question_definitions question
                    WHERE question.category_id = category.id AND question.image_snapshot_json IS NOT NULL);

            UPDATE question_definitions question
            SET category_id = screenshot_category.id
            FROM question_categories old_category
            JOIN question_categories screenshot_category
                ON screenshot_category.name = old_category.name AND screenshot_category.format = 'screenshot'
            WHERE question.category_id = old_category.id AND old_category.format = 'text'
                AND question.image_snapshot_json IS NOT NULL;

            CREATE FUNCTION deadmans_validate_question_category_format()
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

            CREATE TRIGGER trg_question_definitions_category_format
                BEFORE INSERT OR UPDATE OF category_id, image_snapshot_json ON question_definitions
                FOR EACH ROW EXECUTE FUNCTION deadmans_validate_question_category_format();
            CREATE TRIGGER trg_question_categories_format
                BEFORE UPDATE OF format ON question_categories
                FOR EACH ROW EXECUTE FUNCTION deadmans_validate_question_category_format();
            """);
    }

    private static void RemoveCategorySeparation(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DO $migration$
            BEGIN
                IF EXISTS (SELECT 1 FROM question_categories category
                    WHERE category.format = 'screenshot' AND (category.name <> 'БЕЗ КАТЕГОРИИ'
                        OR EXISTS (SELECT 1 FROM question_definitions question WHERE question.category_id = category.id))) THEN
                    RAISE EXCEPTION 'Cannot downgrade a populated screenshot catalogue with independent categories.' USING ERRCODE = '23514';
                END IF;
            END $migration$;
            DROP TRIGGER trg_question_definitions_category_format ON question_definitions;
            DROP TRIGGER trg_question_categories_format ON question_categories;
            DROP FUNCTION deadmans_validate_question_category_format();
            DELETE FROM question_categories WHERE format = 'screenshot';
            """);
    }
}
