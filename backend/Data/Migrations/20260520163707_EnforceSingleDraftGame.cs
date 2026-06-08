using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    public partial class EnforceSingleDraftGame : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_games_Status",
                table: "games");

            migrationBuilder.CreateIndex(
                name: "IX_games_Status_CreatedAtUtc",
                table: "games",
                columns: new[] { "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "UX_games_single_draft",
                table: "games",
                column: "Status",
                unique: true,
                filter: "\"Status\" = 'draft'");
        }
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_games_Status_CreatedAtUtc",
                table: "games");

            migrationBuilder.DropIndex(
                name: "UX_games_single_draft",
                table: "games");

            migrationBuilder.CreateIndex(
                name: "IX_games_Status",
                table: "games",
                column: "Status");
        }
    }
}
