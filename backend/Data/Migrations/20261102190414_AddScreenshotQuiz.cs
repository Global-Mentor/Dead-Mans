using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddScreenshotQuiz : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "image_snapshot_json",
                table: "twitch_quiz_publications",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "image_snapshot_json",
                table: "question_definitions",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "screenshot_answer_duration_seconds",
                table: "games",
                type: "integer",
                nullable: false,
                defaultValue: 60);

            migrationBuilder.AddColumn<string>(
                name: "image_snapshot_json",
                table: "game_quiz_question_sessions",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "image_snapshot_json",
                table: "game_enabled_questions",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "game_quiz_presentations",
                columns: table => new
                {
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    question_session_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_quiz_presentations", x => x.game_id);
                    table.ForeignKey(
                        name: "fk_quiz_presentations_session",
                        columns: x => new { x.game_id, x.question_session_id },
                        principalTable: "game_quiz_question_sessions",
                        principalColumns: new[] { "game_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "question_screenshots",
                columns: table => new
                {
                    question_id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    media_asset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    upload_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    upload_fingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_question_screenshots", x => x.question_id);
                    table.ForeignKey(
                        name: "fk_question_screenshots_hunt_locations_location_id",
                        column: x => x.location_id,
                        principalTable: "hunt_locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_question_screenshots_media_assets_media_asset_id",
                        column: x => x.media_asset_id,
                        principalTable: "media_assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_question_screenshots_question_definitions_question_id",
                        column: x => x.question_id,
                        principalTable: "question_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "ck_games_screenshot_answer_duration",
                table: "games",
                sql: "screenshot_answer_duration_seconds BETWEEN 5 AND 3600");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_presentations_game_id_question_session_id",
                table: "game_quiz_presentations",
                columns: new[] { "game_id", "question_session_id" });

            migrationBuilder.CreateIndex(
                name: "ix_question_screenshots_location_id",
                table: "question_screenshots",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "ix_question_screenshots_media_asset_id",
                table: "question_screenshots",
                column: "media_asset_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_question_screenshots_upload_request_id",
                table: "question_screenshots",
                column: "upload_request_id",
                unique: true);
            AddScreenshotInvariants(migrationBuilder);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            RemoveScreenshotInvariants(migrationBuilder);
            migrationBuilder.DropTable(
                name: "game_quiz_presentations");

            migrationBuilder.DropTable(
                name: "question_screenshots");

            migrationBuilder.DropCheckConstraint(
                name: "ck_games_screenshot_answer_duration",
                table: "games");

            migrationBuilder.DropColumn(
                name: "image_snapshot_json",
                table: "twitch_quiz_publications");

            migrationBuilder.DropColumn(
                name: "image_snapshot_json",
                table: "question_definitions");

            migrationBuilder.DropColumn(
                name: "screenshot_answer_duration_seconds",
                table: "games");

            migrationBuilder.DropColumn(
                name: "image_snapshot_json",
                table: "game_quiz_question_sessions");

            migrationBuilder.DropColumn(
                name: "image_snapshot_json",
                table: "game_enabled_questions");
        }
    }
}
