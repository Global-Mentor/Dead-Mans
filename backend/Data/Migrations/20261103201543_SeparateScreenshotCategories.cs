using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class SeparateScreenshotCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_question_categories_name",
                table: "question_categories");

            migrationBuilder.AddColumn<string>(
                name: "format",
                table: "question_categories",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "text");

            migrationBuilder.CreateIndex(
                name: "ix_question_categories_format_name",
                table: "question_categories",
                columns: new[] { "format", "name" },
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_question_categories_format",
                table: "question_categories",
                sql: "format IN ('text', 'screenshot')");

            SeparateExistingCategories(migrationBuilder);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            RemoveCategorySeparation(migrationBuilder);

            migrationBuilder.DropIndex(
                name: "ix_question_categories_format_name",
                table: "question_categories");

            migrationBuilder.DropCheckConstraint(
                name: "ck_question_categories_format",
                table: "question_categories");

            migrationBuilder.DropColumn(
                name: "format",
                table: "question_categories");

            migrationBuilder.CreateIndex(
                name: "ix_question_categories_name",
                table: "question_categories",
                column: "name",
                unique: true);
        }
    }
}
