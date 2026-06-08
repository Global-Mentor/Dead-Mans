using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814

namespace backend.Data.Migrations
{
    public partial class AddModifierDefinitionsAndSeed : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_game_active_modifiers_GameId_ModifierCode",
                table: "game_active_modifiers");

            migrationBuilder.CreateTable(
                name: "modifier_definitions",
                columns: table => new
                {
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ScoringType = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Tier = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    IconEmoji = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    ActivationCommand = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    ActivationCost = table.Column<int>(type: "integer", nullable: false),
                    DefaultLimitPerGame = table.Column<int>(type: "integer", nullable: true),
                    MetadataJson = table.Column<string>(type: "jsonb", nullable: true),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_modifier_definitions", x => x.Code);
                    table.CheckConstraint("CK_modifier_definitions_cost_non_negative", "\"ActivationCost\" >= 0");
                    table.CheckConstraint("CK_modifier_definitions_kind_allowed", "\"Kind\" IN ('active','passive')");
                    table.CheckConstraint("CK_modifier_definitions_limit_positive_or_null", "\"DefaultLimitPerGame\" IS NULL OR \"DefaultLimitPerGame\" > 0");
                });

            migrationBuilder.CreateTable(
                name: "modifier_conflicts",
                columns: table => new
                {
                    ModifierCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ConflictsWithModifierCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_modifier_conflicts", x => new { x.ModifierCode, x.ConflictsWithModifierCode });
                    table.CheckConstraint("CK_modifier_conflicts_distinct_codes", "\"ModifierCode\" <> \"ConflictsWithModifierCode\"");
                    table.ForeignKey(
                        name: "FK_modifier_conflicts_modifier_definitions_ConflictsWithModifi~",
                        column: x => x.ConflictsWithModifierCode,
                        principalTable: "modifier_definitions",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_modifier_conflicts_modifier_definitions_ModifierCode",
                        column: x => x.ModifierCode,
                        principalTable: "modifier_definitions",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "modifier_definitions",
                columns: new[] { "Code", "ActivationCommand", "ActivationCost", "Category", "CreatedAtUtc", "DefaultLimitPerGame", "Description", "IconEmoji", "Kind", "MetadataJson", "Name", "ScoringType", "Tier", "UpdatedAtUtc" },
                values: new object[,]
                {
                    { "chirik", "!активировать чирик", 3, "movement_restriction", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 5, "Первые 60 секунд разрешено перемещаться только на корточках.", "💰", "active", null, "Чирик", "non_scoring", "low", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "diareya", "!активировать диарея", 7, "behavior_rule", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 1, "При упоминании/обнаружении туалета игрок обязан зайти в него (если нет врага в поле зрения).", "💩", "active", null, "Диарея", "non_scoring", "mid", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "feyerverk", "!активировать фейерверк", 11, "mentor_intervention", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 1, "Ментор раз в минуту стреляет осветительными снарядами в небо 5 минут.", "🎆", "active", null, "Фейерверк", "non_scoring", "high", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "hard75", "!активировать хард75", 18, "score", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 1, "Каждое убийство получает множитель +0.75 до восстановления полосок.", "💀", "active", "{\"killMultiplierDelta\":0.75}", "Хард75", "multiplier", "high", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "kep", "!активировать кэп", 10, "communication_rule", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 1, "Только капитан команды может пользоваться голосовым чатом.", "🔇", "active", null, "Кэп", "non_scoring", "high", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "krysa", "!активировать крыса", 12, "mentor_intervention", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 1, "Ментор с полным набором ловушек; убийства ментора идут в счёт команды.", "🐀", "active", null, "Крыса", "conditional_bonus", "high", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "mentorbait", "!активировать менторбайт", 8, "mentor_intervention", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 1, "Ментор с шумелками на 5 минут, команда решает как использовать.", "📣", "active", null, "Менторбайт", "non_scoring", "mid", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "navyki", "!активировать навыки", 4, "loadout", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 5, "Количество доступных очков навыков уменьшено на 20% (-2 при 10).", "⚙️", "active", null, "Навыки", "non_scoring", "low", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "patron", "!активировать патрон", 4, "score", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 1, "Если враг убит первой пулей, команда получает +1 убийство в счётчик.", "🔫", "active", "{\"bonusKills\":1}", "Патрон", "conditional_bonus", "low", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "podem", "!активировать подъём", 14, "combat_rule", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 1, "Нельзя поднимать союзника, пока не убит враг.", "☠️", "active", null, "Подъём", "non_scoring", "high", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "prokaznik", "!активировать проказник", 6, "mentor_intervention", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 2, "Ментор пакостит 5 минут или пока не кончатся обманки.", "🙊", "active", null, "Проказник", "non_scoring", "mid", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "rashodnik", "!активировать расходник", 4, "loadout", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 4, "Игроки могут заменить один расходник на свой выбор.", "🎯", "active", null, "Расходник", "non_scoring", "low", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "shot", "!активировать шот", 13, "mentor_intervention", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), null, "Ментор получает оружие с одним выстрелом, убийство идёт в счёт команды.", "🥠", "active", null, "Шот", "conditional_bonus", "high", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "trupy", "!активировать трупы", 4, "combat_rule", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 1, "Запрет на сжигание трупов.", "🔥", "active", null, "Трупы", "non_scoring", "low", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { "zhazhda", "!активировать жажда", 3, "score", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), 2, "Убийства дают нарастающий бонус +5, миссия без убийств даёт штраф 25.", "💉", "active", "{\"bonusPerKill\":5,\"missionFailurePenalty\":25}", "Жажда", "conditional_bonus_penalty", "low", new DateTime(2026, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "modifier_conflicts",
                columns: new[] { "ConflictsWithModifierCode", "ModifierCode" },
                values: new object[,]
                {
                    { "mentorbait", "krysa" },
                    { "prokaznik", "krysa" },
                    { "krysa", "mentorbait" },
                    { "prokaznik", "mentorbait" },
                    { "krysa", "prokaznik" },
                    { "mentorbait", "prokaznik" },
                    { "shot", "prokaznik" },
                    { "prokaznik", "shot" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_game_modifier_selections_ModifierCode",
                table: "game_modifier_selections",
                column: "ModifierCode");

            migrationBuilder.CreateIndex(
                name: "IX_game_active_modifiers_GameId_ModifierCode",
                table: "game_active_modifiers",
                columns: new[] { "GameId", "ModifierCode" });

            migrationBuilder.CreateIndex(
                name: "IX_game_active_modifiers_ModifierCode",
                table: "game_active_modifiers",
                column: "ModifierCode");

            migrationBuilder.CreateIndex(
                name: "IX_modifier_conflicts_ConflictsWithModifierCode",
                table: "modifier_conflicts",
                column: "ConflictsWithModifierCode");

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
        }
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_game_active_modifiers_modifier_definitions_ModifierCode",
                table: "game_active_modifiers");

            migrationBuilder.DropForeignKey(
                name: "FK_game_modifier_selections_modifier_definitions_ModifierCode",
                table: "game_modifier_selections");

            migrationBuilder.DropTable(
                name: "modifier_conflicts");

            migrationBuilder.DropTable(
                name: "modifier_definitions");

            migrationBuilder.DropIndex(
                name: "IX_game_modifier_selections_ModifierCode",
                table: "game_modifier_selections");

            migrationBuilder.DropIndex(
                name: "IX_game_active_modifiers_GameId_ModifierCode",
                table: "game_active_modifiers");

            migrationBuilder.DropIndex(
                name: "IX_game_active_modifiers_ModifierCode",
                table: "game_active_modifiers");

            migrationBuilder.CreateIndex(
                name: "IX_game_active_modifiers_GameId_ModifierCode",
                table: "game_active_modifiers",
                columns: new[] { "GameId", "ModifierCode" },
                unique: true);
        }
    }
}
