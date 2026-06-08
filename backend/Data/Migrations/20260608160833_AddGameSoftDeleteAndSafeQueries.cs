using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    public partial class AddGameSoftDeleteAndSafeQueries : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_games_Status_CreatedAtUtc",
                table: "games");

            migrationBuilder.DropIndex(
                name: "UX_games_single_active",
                table: "games");

            migrationBuilder.DropIndex(
                name: "UX_games_single_draft",
                table: "games");

            migrationBuilder.DropIndex(
                name: "UX_games_single_ready",
                table: "games");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "games",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "games",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_games_IsDeleted_Status_CreatedAtUtc",
                table: "games",
                columns: new[] { "IsDeleted", "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "UX_games_single_active",
                table: "games",
                column: "Status",
                unique: true,
                filter: "\"Status\" = 'active' AND \"IsDeleted\" = FALSE");

            migrationBuilder.CreateIndex(
                name: "UX_games_single_draft",
                table: "games",
                column: "Status",
                unique: true,
                filter: "\"Status\" = 'draft' AND \"IsDeleted\" = FALSE");

            migrationBuilder.CreateIndex(
                name: "UX_games_single_ready",
                table: "games",
                column: "Status",
                unique: true,
                filter: "\"Status\" = 'ready' AND \"IsDeleted\" = FALSE");

            migrationBuilder.AddCheckConstraint(
                name: "CK_games_soft_delete_semantics",
                table: "games",
                sql: "(\"IsDeleted\" = FALSE AND \"DeletedAtUtc\" IS NULL) OR (\"IsDeleted\" = TRUE AND \"DeletedAtUtc\" IS NOT NULL)");
        }
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_games_IsDeleted_Status_CreatedAtUtc",
                table: "games");

            migrationBuilder.DropIndex(
                name: "UX_games_single_active",
                table: "games");

            migrationBuilder.DropIndex(
                name: "UX_games_single_draft",
                table: "games");

            migrationBuilder.DropIndex(
                name: "UX_games_single_ready",
                table: "games");

            migrationBuilder.DropCheckConstraint(
                name: "CK_games_soft_delete_semantics",
                table: "games");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "games");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "games");

            migrationBuilder.CreateIndex(
                name: "IX_games_Status_CreatedAtUtc",
                table: "games",
                columns: new[] { "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "UX_games_single_active",
                table: "games",
                column: "Status",
                unique: true,
                filter: "\"Status\" = 'active'");

            migrationBuilder.CreateIndex(
                name: "UX_games_single_draft",
                table: "games",
                column: "Status",
                unique: true,
                filter: "\"Status\" = 'draft'");

            migrationBuilder.CreateIndex(
                name: "UX_games_single_ready",
                table: "games",
                column: "Status",
                unique: true,
                filter: "\"Status\" = 'ready'");
        }
    }
}
