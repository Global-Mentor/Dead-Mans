using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTeamMemberReadiness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ready_at_utc",
                table: "game_team_members",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_team_members_ready_semantics",
                table: "game_team_members",
                sql: "(ready_at_utc IS NULL OR ready_at_utc >= joined_at_utc) AND (left_at_utc IS NULL OR ready_at_utc IS NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_game_team_members_ready_semantics",
                table: "game_team_members");

            migrationBuilder.DropColumn(
                name: "ready_at_utc",
                table: "game_team_members");
        }
    }
}
