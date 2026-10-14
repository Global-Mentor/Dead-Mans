using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRoundBroadcastDrafts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "game_round_broadcast_drafts",
                columns: table => new
                {
                    round_id = table.Column<Guid>(type: "uuid", nullable: false),
                    round_version = table.Column<int>(type: "integer", nullable: false),
                    kills_count = table.Column<int>(type: "integer", nullable: false),
                    bounty_count = table.Column<int>(type: "integer", nullable: false),
                    score_details_json = table.Column<string>(type: "jsonb", nullable: true),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_round_broadcast_drafts", x => x.round_id);
                    table.CheckConstraint("ck_round_broadcast_draft_counts", "kills_count >= 0 AND bounty_count >= 0 AND round_version > 0");
                    table.ForeignKey(
                        name: "fk_game_round_broadcast_drafts_game_rounds_round_id",
                        column: x => x.round_id,
                        principalTable: "game_rounds",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "game_round_broadcast_drafts");
        }
    }
}
