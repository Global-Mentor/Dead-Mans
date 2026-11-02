using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOverlayQuizLeaderboard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "overlay_leaderboard_kind",
                table: "games",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "teams");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "overlay_leaderboard_kind",
                table: "games");
        }
    }
}
