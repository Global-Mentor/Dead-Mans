using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    public partial class AddUserHistoryTracking : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AnsweredForUserId",
                table: "game_question_rounds",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_game_question_rounds_AnsweredByUserId_AnsweredAtUtc",
                table: "game_question_rounds",
                columns: new[] { "AnsweredByUserId", "AnsweredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_game_question_rounds_AnsweredForUserId_AnsweredAtUtc",
                table: "game_question_rounds",
                columns: new[] { "AnsweredForUserId", "AnsweredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_game_question_rounds_AskedByUserId_AskedAtUtc",
                table: "game_question_rounds",
                columns: new[] { "AskedByUserId", "AskedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_game_active_modifiers_ActivatedByUserId_ActivatedAtUtc",
                table: "game_active_modifiers",
                columns: new[] { "ActivatedByUserId", "ActivatedAtUtc" });

            migrationBuilder.AddForeignKey(
                name: "FK_game_active_modifiers_users_ActivatedByUserId",
                table: "game_active_modifiers",
                column: "ActivatedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_game_question_rounds_users_AnsweredByUserId",
                table: "game_question_rounds",
                column: "AnsweredByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_game_question_rounds_users_AnsweredForUserId",
                table: "game_question_rounds",
                column: "AnsweredForUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_game_question_rounds_users_AskedByUserId",
                table: "game_question_rounds",
                column: "AskedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_game_active_modifiers_users_ActivatedByUserId",
                table: "game_active_modifiers");

            migrationBuilder.DropForeignKey(
                name: "FK_game_question_rounds_users_AnsweredByUserId",
                table: "game_question_rounds");

            migrationBuilder.DropForeignKey(
                name: "FK_game_question_rounds_users_AnsweredForUserId",
                table: "game_question_rounds");

            migrationBuilder.DropForeignKey(
                name: "FK_game_question_rounds_users_AskedByUserId",
                table: "game_question_rounds");

            migrationBuilder.DropIndex(
                name: "IX_game_question_rounds_AnsweredByUserId_AnsweredAtUtc",
                table: "game_question_rounds");

            migrationBuilder.DropIndex(
                name: "IX_game_question_rounds_AnsweredForUserId_AnsweredAtUtc",
                table: "game_question_rounds");

            migrationBuilder.DropIndex(
                name: "IX_game_question_rounds_AskedByUserId_AskedAtUtc",
                table: "game_question_rounds");

            migrationBuilder.DropIndex(
                name: "IX_game_active_modifiers_ActivatedByUserId_ActivatedAtUtc",
                table: "game_active_modifiers");

            migrationBuilder.DropColumn(
                name: "AnsweredForUserId",
                table: "game_question_rounds");
        }
    }
}
