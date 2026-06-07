using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public class ModifierDefinitionConfiguration : IEntityTypeConfiguration<ModifierDefinition>
{
    private static readonly DateTime SeedTimestamp = new(2026, 6, 7, 0, 0, 0, DateTimeKind.Utc);

    public void Configure(EntityTypeBuilder<ModifierDefinition> builder)
    {
        builder.ToTable(
            "modifier_definitions",
            tableBuilder =>
            {
                tableBuilder.HasCheckConstraint(
                    "CK_modifier_definitions_kind_allowed",
                    "\"Kind\" IN ('active','passive')"
                );
                tableBuilder.HasCheckConstraint(
                    "CK_modifier_definitions_cost_non_negative",
                    "\"ActivationCost\" >= 0"
                );
                tableBuilder.HasCheckConstraint(
                    "CK_modifier_definitions_limit_positive_or_null",
                    "\"DefaultLimitPerGame\" IS NULL OR \"DefaultLimitPerGame\" > 0"
                );
            }
        );

        builder.HasKey(x => x.Code);
        builder.Property(x => x.Code).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.Kind).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Category).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ScoringType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Tier).HasMaxLength(16).IsRequired();
        builder.Property(x => x.IconEmoji).HasMaxLength(16);
        builder.Property(x => x.ActivationCommand).HasMaxLength(128);
        builder.Property(x => x.ActivationCost).IsRequired();
        builder.Property(x => x.DefaultLimitPerGame);
        builder.Property(x => x.MetadataJson).HasColumnType("jsonb");
        builder.Property(x => x.IsArchived).HasDefaultValue(false);
        builder.Property(x => x.CreatedAtUtc).IsRequired();
        builder.Property(x => x.UpdatedAtUtc).IsRequired();

        builder.HasData(
            new ModifierDefinition
            {
                Code = "chirik",
                Name = "Чирик",
                Description = "Первые 60 секунд разрешено перемещаться только на корточках.",
                Kind = "active",
                Category = "movement_restriction",
                ScoringType = "non_scoring",
                Tier = "low",
                IconEmoji = "💰",
                ActivationCommand = "!активировать чирик",
                ActivationCost = 3,
                DefaultLimitPerGame = 5,
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "zhazhda",
                Name = "Жажда",
                Description = "Убийства дают нарастающий бонус +5, миссия без убийств даёт штраф 25.",
                Kind = "active",
                Category = "score",
                ScoringType = "conditional_bonus_penalty",
                Tier = "low",
                IconEmoji = "💉",
                ActivationCommand = "!активировать жажда",
                ActivationCost = 3,
                DefaultLimitPerGame = 2,
                MetadataJson = "{\"bonusPerKill\":5,\"missionFailurePenalty\":25}",
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "rashodnik",
                Name = "Расходник",
                Description = "Игроки могут заменить один расходник на свой выбор.",
                Kind = "active",
                Category = "loadout",
                ScoringType = "non_scoring",
                Tier = "low",
                IconEmoji = "🎯",
                ActivationCommand = "!активировать расходник",
                ActivationCost = 4,
                DefaultLimitPerGame = 4,
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "trupy",
                Name = "Трупы",
                Description = "Запрет на сжигание трупов.",
                Kind = "active",
                Category = "combat_rule",
                ScoringType = "non_scoring",
                Tier = "low",
                IconEmoji = "🔥",
                ActivationCommand = "!активировать трупы",
                ActivationCost = 4,
                DefaultLimitPerGame = 1,
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "navyki",
                Name = "Навыки",
                Description = "Количество доступных очков навыков уменьшено на 20% (-2 при 10).",
                Kind = "active",
                Category = "loadout",
                ScoringType = "non_scoring",
                Tier = "low",
                IconEmoji = "⚙️",
                ActivationCommand = "!активировать навыки",
                ActivationCost = 4,
                DefaultLimitPerGame = 5,
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "patron",
                Name = "Патрон",
                Description = "Если враг убит первой пулей, команда получает +1 убийство в счётчик.",
                Kind = "active",
                Category = "score",
                ScoringType = "conditional_bonus",
                Tier = "low",
                IconEmoji = "🔫",
                ActivationCommand = "!активировать патрон",
                ActivationCost = 4,
                DefaultLimitPerGame = 1,
                MetadataJson = "{\"bonusKills\":1}",
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "prokaznik",
                Name = "Проказник",
                Description = "Ментор пакостит 5 минут или пока не кончатся обманки.",
                Kind = "active",
                Category = "mentor_intervention",
                ScoringType = "non_scoring",
                Tier = "mid",
                IconEmoji = "🙊",
                ActivationCommand = "!активировать проказник",
                ActivationCost = 6,
                DefaultLimitPerGame = 2,
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "diareya",
                Name = "Диарея",
                Description = "При упоминании/обнаружении туалета игрок обязан зайти в него (если нет врага в поле зрения).",
                Kind = "active",
                Category = "behavior_rule",
                ScoringType = "non_scoring",
                Tier = "mid",
                IconEmoji = "💩",
                ActivationCommand = "!активировать диарея",
                ActivationCost = 7,
                DefaultLimitPerGame = 1,
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "mentorbait",
                Name = "Менторбайт",
                Description = "Ментор с шумелками на 5 минут, команда решает как использовать.",
                Kind = "active",
                Category = "mentor_intervention",
                ScoringType = "non_scoring",
                Tier = "mid",
                IconEmoji = "📣",
                ActivationCommand = "!активировать менторбайт",
                ActivationCost = 8,
                DefaultLimitPerGame = 1,
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "kep",
                Name = "Кэп",
                Description = "Только капитан команды может пользоваться голосовым чатом.",
                Kind = "active",
                Category = "communication_rule",
                ScoringType = "non_scoring",
                Tier = "high",
                IconEmoji = "🔇",
                ActivationCommand = "!активировать кэп",
                ActivationCost = 10,
                DefaultLimitPerGame = 1,
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "feyerverk",
                Name = "Фейерверк",
                Description = "Ментор раз в минуту стреляет осветительными снарядами в небо 5 минут.",
                Kind = "active",
                Category = "mentor_intervention",
                ScoringType = "non_scoring",
                Tier = "high",
                IconEmoji = "🎆",
                ActivationCommand = "!активировать фейерверк",
                ActivationCost = 11,
                DefaultLimitPerGame = 1,
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "krysa",
                Name = "Крыса",
                Description = "Ментор с полным набором ловушек; убийства ментора идут в счёт команды.",
                Kind = "active",
                Category = "mentor_intervention",
                ScoringType = "conditional_bonus",
                Tier = "high",
                IconEmoji = "🐀",
                ActivationCommand = "!активировать крыса",
                ActivationCost = 12,
                DefaultLimitPerGame = 1,
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "shot",
                Name = "Шот",
                Description = "Ментор получает оружие с одним выстрелом, убийство идёт в счёт команды.",
                Kind = "active",
                Category = "mentor_intervention",
                ScoringType = "conditional_bonus",
                Tier = "high",
                IconEmoji = "🥠",
                ActivationCommand = "!активировать шот",
                ActivationCost = 13,
                DefaultLimitPerGame = null,
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "podem",
                Name = "Подъём",
                Description = "Нельзя поднимать союзника, пока не убит враг.",
                Kind = "active",
                Category = "combat_rule",
                ScoringType = "non_scoring",
                Tier = "high",
                IconEmoji = "☠️",
                ActivationCommand = "!активировать подъём",
                ActivationCost = 14,
                DefaultLimitPerGame = 1,
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            },
            new ModifierDefinition
            {
                Code = "hard75",
                Name = "Хард75",
                Description = "Каждое убийство получает множитель +0.75 до восстановления полосок.",
                Kind = "active",
                Category = "score",
                ScoringType = "multiplier",
                Tier = "high",
                IconEmoji = "💀",
                ActivationCommand = "!активировать хард75",
                ActivationCost = 18,
                DefaultLimitPerGame = 1,
                MetadataJson = "{\"killMultiplierDelta\":0.75}",
                CreatedAtUtc = SeedTimestamp,
                UpdatedAtUtc = SeedTimestamp
            }
        );
    }
}
