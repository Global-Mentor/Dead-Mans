using backend.Data;
using backend.Data.Entities;
using backend.Domain.GameModifiers;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Integration.Postgres;

public sealed class BaseModifierSeedMigrationTests : IClassFixture<PostgresTestDatabase>
{
    private readonly PostgresTestDatabase _database;

    public BaseModifierSeedMigrationTests(PostgresTestDatabase database)
    {
        _database = database;
    }

    [Fact]
    public async Task LatestMigration_SeedsCompleteBaseModifierCatalog()
    {
        var expected = new[]
        {
            new ExpectedModifier(ModifierDefinitionSeedIds.Chirik, BuiltInModifierBehaviorCatalog.Chirik,
                "Чирик", "💰", "!активировать чирик", 3, 5),
            new ExpectedModifier(ModifierDefinitionSeedIds.Zhazhda, BuiltInModifierBehaviorCatalog.Zhazhda,
                "Жажда", "💉", "!активировать жажда", 3, 2),
            new ExpectedModifier(ModifierDefinitionSeedIds.Rashodnik, BuiltInModifierBehaviorCatalog.Rashodnik,
                "Расходник", "🎯", "!активировать расходник", 4, 4),
            new ExpectedModifier(ModifierDefinitionSeedIds.Trupy, BuiltInModifierBehaviorCatalog.Trupy,
                "Трупы", "🔥", "!активировать трупы", 4, 1),
            new ExpectedModifier(ModifierDefinitionSeedIds.Navyki, BuiltInModifierBehaviorCatalog.Navyki,
                "Навыки", "⚙️", "!активировать навыки", 4, 5),
            new ExpectedModifier(ModifierDefinitionSeedIds.Patron, BuiltInModifierBehaviorCatalog.Patron,
                "Патрон", "🔫", "!активировать патрон", 4, 1),
            new ExpectedModifier(ModifierDefinitionSeedIds.Prokaznik, BuiltInModifierBehaviorCatalog.Prokaznik,
                "Проказник", "🙊", "!активировать проказник", 6, 2),
            new ExpectedModifier(ModifierDefinitionSeedIds.Diareya, BuiltInModifierBehaviorCatalog.Diareya,
                "Диарея", "💩", "!активировать диарея", 7, 1),
            new ExpectedModifier(ModifierDefinitionSeedIds.Mentorbait, BuiltInModifierBehaviorCatalog.Mentorbait,
                "Менторбайт", "📣", "!активировать менторбайт", 8, 1),
            new ExpectedModifier(ModifierDefinitionSeedIds.Kep, BuiltInModifierBehaviorCatalog.Kep,
                "Кэп", "🔇", "!активировать кэп", 10, 1),
            new ExpectedModifier(ModifierDefinitionSeedIds.Feyerverk, BuiltInModifierBehaviorCatalog.Feyerverk,
                "Фейерверк", "🎆", "!активировать фейерверк", 11, 1),
            new ExpectedModifier(ModifierDefinitionSeedIds.Krysa, BuiltInModifierBehaviorCatalog.Krysa,
                "Крыса", "🐀", "!активировать крыса", 12, 1),
            new ExpectedModifier(ModifierDefinitionSeedIds.Shot, BuiltInModifierBehaviorCatalog.Shot,
                "Шот", "🥠", "!активировать шот", 13, null),
            new ExpectedModifier(ModifierDefinitionSeedIds.Podem, BuiltInModifierBehaviorCatalog.Podem,
                "Подъём", "☠️", "!активировать подъём", 14, 1),
            new ExpectedModifier(ModifierDefinitionSeedIds.Hard75, BuiltInModifierBehaviorCatalog.Hard75,
                "Хард75", "💀", "!активировать хард75", 18, 1)
        };

        await using var db = _database.CreateDbContext();
        var expectedIds = expected.Select(item => item.Id).ToArray();
        var definitions = await db.ModifierDefinitions
            .AsNoTracking()
            .Where(definition => expectedIds.Contains(definition.Id))
            .Include(definition => definition.CurrentVersion)
            .ThenInclude(version => version!.Conflicts)
            .ToDictionaryAsync(definition => definition.Id);

        Assert.Equal(expected.Length, definitions.Count);
        foreach (var item in expected)
        {
            var definition = definitions[item.Id];
            Assert.False(definition.IsArchived);
            Assert.NotNull(definition.CurrentVersion);

            var version = definition.CurrentVersion;
            Assert.Equal(1, version.Revision);
            Assert.Equal(item.Name, version.Name);
            Assert.Equal(item.IconEmoji, version.IconEmoji);
            Assert.Equal(item.ActivationCommand, version.ActivationCommand);
            Assert.Equal(item.ActivationCost, version.ActivationCost);
            Assert.Equal(item.MaxActivationsPerRound, version.MaxActivationsPerRound);
            Assert.False(string.IsNullOrWhiteSpace(version.Description));
            Assert.Equal("migration_baseline", version.ChangeType);
            Assert.Equal(["created"], version.ChangedFields);

            var builtIn = BuiltInModifierBehaviorCatalog.Get(item.BehaviorCode);
            Assert.Equal(builtIn.NormalizedTags, version.NormalizedTags);
            Assert.Equal(
                ModifierBehaviorV2Json.Serialize(builtIn.Behavior),
                ModifierBehaviorV2Json.Serialize(
                    ModifierBehaviorV2Json.Deserialize(version.BehaviorV2Json)
                )
            );
        }

        AssertConflicts(definitions, ModifierDefinitionSeedIds.Prokaznik,
            ModifierDefinitionSeedIds.Mentorbait,
            ModifierDefinitionSeedIds.Krysa,
            ModifierDefinitionSeedIds.Shot);
        AssertConflicts(definitions, ModifierDefinitionSeedIds.Mentorbait,
            ModifierDefinitionSeedIds.Prokaznik,
            ModifierDefinitionSeedIds.Krysa);
        AssertConflicts(definitions, ModifierDefinitionSeedIds.Krysa,
            ModifierDefinitionSeedIds.Prokaznik,
            ModifierDefinitionSeedIds.Mentorbait);
        AssertConflicts(definitions, ModifierDefinitionSeedIds.Shot,
            ModifierDefinitionSeedIds.Prokaznik);

        foreach (var definition in definitions.Values.Where(definition =>
                     definition.Id != ModifierDefinitionSeedIds.Prokaznik
                     && definition.Id != ModifierDefinitionSeedIds.Mentorbait
                     && definition.Id != ModifierDefinitionSeedIds.Krysa
                     && definition.Id != ModifierDefinitionSeedIds.Shot))
        {
            Assert.Empty(definition.CurrentVersion!.Conflicts);
        }
    }

    private static void AssertConflicts(
        IReadOnlyDictionary<Guid, ModifierDefinition> definitions,
        Guid modifierId,
        params Guid[] expectedConflictIds
    )
    {
        var conflicts = definitions[modifierId].CurrentVersion!.Conflicts
            .Select(conflict => conflict.ConflictingModifierId)
            .Order()
            .ToArray();
        Assert.Equal(expectedConflictIds.Order().ToArray(), conflicts);
    }

    private sealed record ExpectedModifier(
        Guid Id,
        string BehaviorCode,
        string Name,
        string IconEmoji,
        string ActivationCommand,
        int ActivationCost,
        int? MaxActivationsPerRound
    );
}
