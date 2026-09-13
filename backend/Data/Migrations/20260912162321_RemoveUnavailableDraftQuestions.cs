using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUnavailableDraftQuestions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                WITH removed AS (
                    DELETE FROM game_enabled_questions selection
                    USING games game, question_definitions question
                    WHERE selection.game_id = game.id
                      AND selection.question_id = question.id
                      AND game.status = 'draft'
                      AND NOT game.is_deleted
                      AND (NOT question.is_enabled OR question.is_deleted)
                    RETURNING selection.game_id
                )
                UPDATE game_boards
                SET version = version + 1
                WHERE game_id IN (SELECT game_id FROM removed);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Do not reattach unavailable questions when rolling application code back.
        }
    }
}
