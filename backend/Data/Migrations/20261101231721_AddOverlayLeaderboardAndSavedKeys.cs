using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOverlayLeaderboardAndSavedKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "overlay_leaderboard_enabled",
                table: "games",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "protected_key",
                table: "game_overlay_keys",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "overlay_leaderboard_enabled",
                table: "games");

            migrationBuilder.DropColumn(
                name: "protected_key",
                table: "game_overlay_keys");
        }
    }
}
