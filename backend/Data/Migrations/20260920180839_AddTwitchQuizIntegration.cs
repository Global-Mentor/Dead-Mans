using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTwitchQuizIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "twitch_eventsub_receipts",
                columns: table => new
                {
                    notification_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    chat_message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    question_session_id = table.Column<Guid>(type: "uuid", nullable: true),
                    outcome = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    event_timestamp_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    processed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_twitch_eventsub_receipts", x => x.notification_id);
                });

            migrationBuilder.CreateTable(
                name: "twitch_quiz_connections",
                columns: table => new
                {
                    role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    twitch_user_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    login = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    display_name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    protected_access_token = table.Column<string>(type: "character varying(8192)", maxLength: 8192, nullable: false),
                    protected_refresh_token = table.Column<string>(type: "character varying(8192)", maxLength: 8192, nullable: false),
                    scopes = table.Column<string[]>(type: "text[]", nullable: false),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    revoked_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_error = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_twitch_quiz_connections", x => x.role);
                });

            migrationBuilder.CreateTable(
                name: "twitch_quiz_publications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    question_id = table.Column<Guid>(type: "uuid", nullable: false),
                    question_session_id = table.Column<Guid>(type: "uuid", nullable: true),
                    ask_order = table.Column<int>(type: "integer", nullable: false),
                    duration_seconds = table.Column<int>(type: "integer", nullable: false),
                    question_revision_snapshot = table.Column<int>(type: "integer", nullable: false),
                    question_code_snapshot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    category_name_snapshot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    question_text_snapshot = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    option_ids_snapshot = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    option_texts_snapshot = table.Column<string[]>(type: "text[]", nullable: false),
                    correct_option_id_snapshot = table.Column<Guid>(type: "uuid", nullable: false),
                    reward_snapshot = table.Column<int>(type: "integer", nullable: false),
                    question_message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    options_message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    question_delivery_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    options_delivery_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    outcome_delivery_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    question_message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    options_message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    outcome_message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    last_error = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_twitch_quiz_publications", x => x.id);
                    table.ForeignKey(
                        name: "fk_twitch_quiz_publications_question_session",
                        column: x => x.question_session_id,
                        principalTable: "game_quiz_question_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_twitch_quiz_publications_games_game_id",
                        column: x => x.game_id,
                        principalTable: "games",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_twitch_quiz_publications_question_definitions_question_id",
                        column: x => x.question_id,
                        principalTable: "question_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_twitch_eventsub_receipts_chat_message_id",
                table: "twitch_eventsub_receipts",
                column: "chat_message_id",
                unique: true,
                filter: "chat_message_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_twitch_eventsub_receipts_processed_at_utc",
                table: "twitch_eventsub_receipts",
                column: "processed_at_utc");

            migrationBuilder.CreateIndex(
                name: "ix_twitch_quiz_connections_twitch_user_id",
                table: "twitch_quiz_connections",
                column: "twitch_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_twitch_quiz_publications_game_id_ask_order",
                table: "twitch_quiz_publications",
                columns: new[] { "game_id", "ask_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_twitch_quiz_publications_game_id_question_id",
                table: "twitch_quiz_publications",
                columns: new[] { "game_id", "question_id" },
                unique: true,
                filter: "status <> 'cancelled'");

            migrationBuilder.CreateIndex(
                name: "ix_twitch_quiz_publications_question_id",
                table: "twitch_quiz_publications",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "ix_twitch_quiz_publications_question_session_id",
                table: "twitch_quiz_publications",
                column: "question_session_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_twitch_quiz_publications_active",
                table: "twitch_quiz_publications",
                column: "game_id",
                unique: true,
                filter: "status IN ('publishing','failed','uncertain','cancel_pending','open')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "twitch_eventsub_receipts");

            migrationBuilder.DropTable(
                name: "twitch_quiz_connections");

            migrationBuilder.DropTable(
                name: "twitch_quiz_publications");
        }
    }
}
