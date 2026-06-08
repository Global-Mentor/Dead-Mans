using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    public partial class AddGameQuestions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "question_vectors",
                columns: table => new
                {
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_question_vectors", x => x.Code);
                    table.CheckConstraint("CK_question_vectors_code_not_blank", "length(trim(\"Code\")) > 0");
                });

            migrationBuilder.CreateTable(
                name: "question_definitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VectorCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ExternalCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Answer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    NormalizedAnswer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Reward = table.Column<int>(type: "integer", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    AskedTotalCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    CorrectTotalCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    LastAskedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_question_definitions", x => x.Id);
                    table.CheckConstraint("CK_question_definitions_asked_total_non_negative", "\"AskedTotalCount\" >= 0");
                    table.CheckConstraint("CK_question_definitions_correct_total_non_negative", "\"CorrectTotalCount\" >= 0");
                    table.CheckConstraint("CK_question_definitions_counts_relation", "\"CorrectTotalCount\" <= \"AskedTotalCount\"");
                    table.CheckConstraint("CK_question_definitions_reward_non_negative", "\"Reward\" >= 0");
                    table.CheckConstraint("CK_question_definitions_sort_order_non_negative", "\"SortOrder\" >= 0");
                    table.ForeignKey(
                        name: "FK_question_definitions_question_vectors_VectorCode",
                        column: x => x.VectorCode,
                        principalTable: "question_vectors",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "game_question_rounds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    AskOrder = table.Column<int>(type: "integer", nullable: false),
                    AskedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AskedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    AnsweredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AnsweredByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AnsweredByDisplayName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    SubmittedAnswer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: true),
                    AwardedPoints = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_game_question_rounds", x => x.Id);
                    table.CheckConstraint("CK_game_question_rounds_ask_order_positive", "\"AskOrder\" > 0");
                    table.CheckConstraint("CK_game_question_rounds_awarded_points_non_negative_or_null", "\"AwardedPoints\" IS NULL OR \"AwardedPoints\" >= 0");
                    table.CheckConstraint("CK_game_question_rounds_status_allowed", "\"Status\" IN ('asked','answered_correct','answered_wrong','timeout','skipped')");
                    table.ForeignKey(
                        name: "FK_game_question_rounds_games_GameId",
                        column: x => x.GameId,
                        principalTable: "games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_game_question_rounds_question_definitions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "question_definitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_game_question_rounds_GameId_AskedAtUtc",
                table: "game_question_rounds",
                columns: new[] { "GameId", "AskedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_game_question_rounds_GameId_AskOrder",
                table: "game_question_rounds",
                columns: new[] { "GameId", "AskOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_game_question_rounds_GameId_QuestionId",
                table: "game_question_rounds",
                columns: new[] { "GameId", "QuestionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_game_question_rounds_GameId_Status",
                table: "game_question_rounds",
                columns: new[] { "GameId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_game_question_rounds_QuestionId",
                table: "game_question_rounds",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_question_definitions_IsEnabled_AskedTotalCount_LastAskedAtU~",
                table: "question_definitions",
                columns: new[] { "IsEnabled", "AskedTotalCount", "LastAskedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_question_definitions_SortOrder",
                table: "question_definitions",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_question_definitions_VectorCode_Category_IsEnabled",
                table: "question_definitions",
                columns: new[] { "VectorCode", "Category", "IsEnabled" });

            migrationBuilder.CreateIndex(
                name: "IX_question_definitions_VectorCode_ExternalCode",
                table: "question_definitions",
                columns: new[] { "VectorCode", "ExternalCode" },
                unique: true);
        }
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "game_question_rounds");

            migrationBuilder.DropTable(
                name: "question_definitions");

            migrationBuilder.DropTable(
                name: "question_vectors");
        }

    }
}
