using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGameModifiers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "game_active_modifiers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModifierCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ActivatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_game_active_modifiers", x => x.Id);
                    table.CheckConstraint("CK_game_active_modifiers_code_not_blank", "length(trim(\"ModifierCode\")) > 0");
                    table.ForeignKey(
                        name: "FK_game_active_modifiers_games_GameId",
                        column: x => x.GameId,
                        principalTable: "games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "game_modifier_selections",
                columns: table => new
                {
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModifierCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    EnabledAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_game_modifier_selections", x => new { x.GameId, x.ModifierCode });
                    table.CheckConstraint("CK_game_modifier_selections_code_not_blank", "length(trim(\"ModifierCode\")) > 0");
                    table.ForeignKey(
                        name: "FK_game_modifier_selections_games_GameId",
                        column: x => x.GameId,
                        principalTable: "games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_game_active_modifiers_GameId_ActivatedAtUtc",
                table: "game_active_modifiers",
                columns: new[] { "GameId", "ActivatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_game_active_modifiers_GameId_ModifierCode",
                table: "game_active_modifiers",
                columns: new[] { "GameId", "ModifierCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_game_modifier_selections_GameId",
                table: "game_modifier_selections",
                column: "GameId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "game_active_modifiers");

            migrationBuilder.DropTable(
                name: "game_modifier_selections");
        }
    }
}
