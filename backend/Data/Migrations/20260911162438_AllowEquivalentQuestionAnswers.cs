using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class AllowEquivalentQuestionAnswers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_question_accepted_answers_one_primary",
                table: "question_accepted_answers");

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
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM question_definitions question
                        LEFT JOIN LATERAL (
                            SELECT
                                count(*) AS answer_count,
                                count(*) FILTER (WHERE answer.is_primary) AS primary_count
                            FROM question_accepted_answers answer
                            WHERE answer.question_id = question.id
                        ) counts ON TRUE
                        WHERE counts.answer_count = 0
                           OR counts.primary_count <> 1
                    ) THEN
                        RAISE EXCEPTION 'Cannot restore the previous primary-answer rules while a question does not have exactly one primary accepted answer.'
                            USING ERRCODE = '55000';
                    END IF;
                END;
                $$;

                CREATE OR REPLACE FUNCTION deadmans_assert_question_answers(p_question_id uuid)
                RETURNS void
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                DECLARE
                    answer_count bigint;
                    primary_count bigint;
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM question_definitions WHERE id = p_question_id) THEN
                        RETURN;
                    END IF;

                    SELECT count(*), count(*) FILTER (WHERE is_primary)
                    INTO answer_count, primary_count
                    FROM question_accepted_answers
                    WHERE question_id = p_question_id;

                    IF answer_count = 0 OR primary_count <> 1 THEN
                        RAISE EXCEPTION
                            'Question % must have accepted answers and exactly one primary answer.',
                            p_question_id
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_question_accepted_answers_complete_set';
                    END IF;
                END;
                $$;
                """
            );

            migrationBuilder.CreateIndex(
                name: "ux_question_accepted_answers_one_primary",
                table: "question_accepted_answers",
                column: "question_id",
                unique: true,
                filter: "is_primary = TRUE");
        }
    }
}
