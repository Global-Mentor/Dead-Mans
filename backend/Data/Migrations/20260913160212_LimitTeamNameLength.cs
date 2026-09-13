using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class LimitTeamNameLength : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM game_teams
                        WHERE char_length(name) > 18
                    ) THEN
                        RAISE EXCEPTION 'Team names longer than 18 characters must be shortened before applying this migration.';
                    END IF;
                END
                $$;
                """
            );

            migrationBuilder.AlterColumn<string>(
                name: "name",
                table: "game_teams",
                type: "character varying(18)",
                maxLength: 18,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(48)",
                oldMaxLength: 48,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "name",
                table: "game_teams",
                type: "character varying(48)",
                maxLength: 48,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(18)",
                oldMaxLength: 18,
                oldNullable: true);
        }
    }
}
