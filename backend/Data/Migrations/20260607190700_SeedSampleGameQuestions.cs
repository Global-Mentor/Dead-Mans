using backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260607190700_SeedSampleGameQuestions")]
    public partial class SeedSampleGameQuestions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                INSERT INTO question_vectors ("Code", "Name", "IsEnabled", "CreatedAtUtc", "UpdatedAtUtc")
                VALUES ('sample-default', 'Sample default vector', TRUE, NOW(), NOW())
                ON CONFLICT ("Code") DO NOTHING;
                """
            );

            migrationBuilder.Sql(
                """
                INSERT INTO question_definitions
                (
                    "Id",
                    "VectorCode",
                    "ExternalCode",
                    "Category",
                    "Text",
                    "Answer",
                    "NormalizedAnswer",
                    "Reward",
                    "IsEnabled",
                    "SortOrder",
                    "AskedTotalCount",
                    "CorrectTotalCount",
                    "LastAskedAtUtc",
                    "CreatedAtUtc",
                    "UpdatedAtUtc"
                )
                VALUES
                (
                    '11111111-1111-1111-1111-111111111111',
                    'sample-default',
                    'sample-q-0001',
                    'lore',
                    'Кто ведет матч как основной ведущий?',
                    'Ведущий',
                    'ведущий',
                    1,
                    TRUE,
                    1,
                    0,
                    0,
                    NULL,
                    NOW(),
                    NOW()
                ),
                (
                    '22222222-2222-2222-2222-222222222222',
                    'sample-default',
                    'sample-q-0002',
                    'locations',
                    'Сколько эвакуационных точек обычно доступно на карте?',
                    '2',
                    '2',
                    2,
                    TRUE,
                    2,
                    0,
                    0,
                    NULL,
                    NOW(),
                    NOW()
                ),
                (
                    '33333333-3333-3333-3333-333333333333',
                    'sample-default',
                    'sample-q-0003',
                    'weapons_and_items',
                    'Как называется оружие для бесшумного дальнего выстрела болтом?',
                    'Арбалет',
                    'арбалет',
                    2,
                    TRUE,
                    3,
                    0,
                    0,
                    NULL,
                    NOW(),
                    NOW()
                ),
                (
                    '44444444-4444-4444-4444-444444444444',
                    'sample-default',
                    'sample-q-0004',
                    'stats',
                    'Сколько очков дается за правильный ответ в этом демо-вопросе?',
                    '3',
                    '3',
                    3,
                    TRUE,
                    4,
                    0,
                    0,
                    NULL,
                    NOW(),
                    NOW()
                )
                ON CONFLICT ("Id") DO NOTHING;
                """
            );
        }
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE FROM question_definitions
                WHERE "Id" IN
                (
                    '11111111-1111-1111-1111-111111111111',
                    '22222222-2222-2222-2222-222222222222',
                    '33333333-3333-3333-3333-333333333333',
                    '44444444-4444-4444-4444-444444444444'
                );
                """
            );

            migrationBuilder.Sql(
                """
                DELETE FROM question_vectors
                WHERE "Code" = 'sample-default'
                  AND NOT EXISTS
                  (
                      SELECT 1 FROM question_definitions q
                      WHERE q."VectorCode" = 'sample-default'
                  );
                """
            );
        }
    }
}
