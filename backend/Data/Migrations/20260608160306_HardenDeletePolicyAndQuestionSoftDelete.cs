using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    public partial class HardenDeletePolicyAndQuestionSoftDelete : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_game_active_modifiers_modifier_definitions_ModifierCode",
                table: "game_active_modifiers");

            migrationBuilder.DropForeignKey(
                name: "FK_game_modifier_selections_modifier_definitions_ModifierCode",
                table: "game_modifier_selections");

            migrationBuilder.DropForeignKey(
                name: "FK_game_question_rounds_question_definitions_QuestionId",
                table: "game_question_rounds");

            migrationBuilder.DropIndex(
                name: "IX_question_definitions_IsEnabled_AskedTotalCount_LastAskedAtU~",
                table: "question_definitions");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "question_definitions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "question_definitions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_question_definitions_IsDeleted_IsEnabled_AskedTotalCount_La~",
                table: "question_definitions",
                columns: new[] { "IsDeleted", "IsEnabled", "AskedTotalCount", "LastAskedAtUtc" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_question_definitions_soft_delete_semantics",
                table: "question_definitions",
                sql: "(\"IsDeleted\" = FALSE AND \"DeletedAtUtc\" IS NULL) OR (\"IsDeleted\" = TRUE AND \"DeletedAtUtc\" IS NOT NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_game_active_modifiers_modifier_definitions_ModifierCode",
                table: "game_active_modifiers",
                column: "ModifierCode",
                principalTable: "modifier_definitions",
                principalColumn: "Code",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_game_modifier_selections_modifier_definitions_ModifierCode",
                table: "game_modifier_selections",
                column: "ModifierCode",
                principalTable: "modifier_definitions",
                principalColumn: "Code",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_game_question_rounds_question_definitions_QuestionId",
                table: "game_question_rounds",
                column: "QuestionId",
                principalTable: "question_definitions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_game_active_modifiers_modifier_definitions_ModifierCode",
                table: "game_active_modifiers");

            migrationBuilder.DropForeignKey(
                name: "FK_game_modifier_selections_modifier_definitions_ModifierCode",
                table: "game_modifier_selections");

            migrationBuilder.DropForeignKey(
                name: "FK_game_question_rounds_question_definitions_QuestionId",
                table: "game_question_rounds");

            migrationBuilder.DropIndex(
                name: "IX_question_definitions_IsDeleted_IsEnabled_AskedTotalCount_La~",
                table: "question_definitions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_question_definitions_soft_delete_semantics",
                table: "question_definitions");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "question_definitions");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "question_definitions");

            migrationBuilder.CreateIndex(
                name: "IX_question_definitions_IsEnabled_AskedTotalCount_LastAskedAtU~",
                table: "question_definitions",
                columns: new[] { "IsEnabled", "AskedTotalCount", "LastAskedAtUtc" });

            migrationBuilder.AddForeignKey(
                name: "FK_game_active_modifiers_modifier_definitions_ModifierCode",
                table: "game_active_modifiers",
                column: "ModifierCode",
                principalTable: "modifier_definitions",
                principalColumn: "Code",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_game_modifier_selections_modifier_definitions_ModifierCode",
                table: "game_modifier_selections",
                column: "ModifierCode",
                principalTable: "modifier_definitions",
                principalColumn: "Code",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_game_question_rounds_question_definitions_QuestionId",
                table: "game_question_rounds",
                column: "QuestionId",
                principalTable: "question_definitions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
