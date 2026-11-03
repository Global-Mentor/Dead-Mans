using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class HardenScreenshotOptionIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
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

                DO $migration$
                DECLARE question_id uuid;
                BEGIN
                    FOR question_id IN SELECT id FROM question_definitions WHERE image_snapshot_json IS NOT NULL LOOP
                        PERFORM deadmans_assert_question_options(question_id);
                    END LOOP;
                END $migration$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE OR REPLACE FUNCTION deadmans_assert_question_options(p_question_id uuid)
                RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
                DECLARE option_count bigint; correct_count bigint;
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM question_definitions WHERE id = p_question_id) THEN RETURN; END IF;
                    SELECT count(*), count(*) FILTER (WHERE is_correct)
                    INTO option_count, correct_count FROM question_options WHERE question_id = p_question_id;
                    IF option_count NOT BETWEEN 2 AND 10 OR correct_count <> 1 THEN
                        RAISE EXCEPTION 'Question % must have between two and ten options and exactly one correct option.', p_question_id
                            USING ERRCODE = '23514', CONSTRAINT = 'ck_question_options_complete_set';
                    END IF;
                END $function$;
                """);
        }
    }
}
