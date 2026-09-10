using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.GameModifiers;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Integration.Postgres;

public sealed class ModifierCatalogUpdateTests : IClassFixture<PostgresTestDatabase>
{
    private readonly PostgresTestDatabase _database;

    public ModifierCatalogUpdateTests(PostgresTestDatabase database)
    {
        _database = database;
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Rename_RefreshesReciprocalNamesWithoutRewritingHistory(bool archiveCompanion)
    {
        await _database.ResetAsync();
        var actor = await CreateActorAsync();
        var companion = await CreateAsync("Companion", [], actor);
        var target = await CreateAsync("Original name", [companion.Id], actor);
        if (archiveCompanion)
        {
            await using var archiveDb = _database.CreateDbContext();
            Assert.Equal(ArchiveGameModifierRepositoryStatus.Archived,
                await new DbGameModifierRepository(archiveDb, TimeProvider.System)
                    .ArchiveModifierAsync(companion.Id, 2, actor));
        }

        UpdateGameModifierRepositoryResult updated;
        await using (var db = _database.CreateDbContext())
        {
            updated = await new DbGameModifierRepository(db, TimeProvider.System)
                .UpdateModifierAsync(target.Id, UpdateInput(target, "Renamed",
                    archiveCompanion ? [] : [companion.Id]), actor);
        }

        Assert.Equal(UpdateGameModifierRepositoryStatus.Updated, updated.Status);
        Assert.Equal(2, updated.Changes!.Count);
        await using var assertDb = _database.CreateDbContext();
        var versions = await assertDb.ModifierDefinitionVersions.AsNoTracking()
            .Include(x => x.Conflicts).Where(x => x.ModifierId == companion.Id)
            .OrderBy(x => x.Revision).ToArrayAsync();
        Assert.Equal(3, versions.Length);
        Assert.Equal("Original name", Assert.Single(versions[1].Conflicts).ConflictingModifierNameSnapshot);
        Assert.Equal("Renamed", Assert.Single(versions[2].Conflicts).ConflictingModifierNameSnapshot);
        Assert.Equal(ModifierVersionChangeTypeValue.CompatibilityCascade, versions[2].ChangeType);
        Assert.Equal(target.Id, versions[2].CascadeSourceModifierId);
        Assert.Equal(actor.UserId, versions[2].CreatedByUserId);
        Assert.Equal(archiveCompanion, await assertDb.ModifierDefinitions
            .Where(x => x.Id == companion.Id).Select(x => x.IsArchived).SingleAsync());
    }

    [Fact]
    public async Task RenameWithCompatibilityEdit_UpdatesEveryAffectedSideOnce()
    {
        await _database.ResetAsync();
        var actor = await CreateActorAsync();
        var retained = await CreateAsync("Retained", [], actor);
        var removed = await CreateAsync("Removed", [], actor);
        var added = await CreateAsync("Added", [retained.Id], actor);
        var target = await CreateAsync("Original", [retained.Id, removed.Id], actor);

        await using (var db = _database.CreateDbContext())
        {
            var updated = await new DbGameModifierRepository(db, TimeProvider.System)
                .UpdateModifierAsync(target.Id,
                    UpdateInput(target, "Renamed", [retained.Id, added.Id]), actor);
            Assert.Equal(UpdateGameModifierRepositoryStatus.Updated, updated.Status);
            Assert.Equal(4, updated.Changes!.Count);
            Assert.Equal(4, updated.Changes.Select(x => x.ModifierId).Distinct().Count());
        }

        await using var assertDb = _database.CreateDbContext();
        var current = await assertDb.ModifierDefinitions.AsNoTracking()
            .Include(x => x.CurrentVersion!).ThenInclude(x => x.Conflicts)
            .ToDictionaryAsync(x => x.Id, x => x.CurrentVersion!);
        Assert.Equal(4, current[retained.Id].Revision);
        Assert.Equal(3, current[removed.Id].Revision);
        Assert.Equal(2, current[added.Id].Revision);
        Assert.Equal(2, current[target.Id].Revision);
        Assert.Empty(current[removed.Id].Conflicts);
        foreach (var neighbor in new[] { retained.Id, added.Id })
        {
            Assert.Equal("Renamed", Assert.Single(current[neighbor].Conflicts,
                x => x.ConflictingModifierId == target.Id).ConflictingModifierNameSnapshot);
        }
        Assert.Equal(2, current[target.Id].Conflicts.Count);
        Assert.Contains(current[retained.Id].Conflicts, x => x.ConflictingModifierId == added.Id);
        Assert.Contains(current[added.Id].Conflicts, x => x.ConflictingModifierId == retained.Id);
    }

    [Fact]
    public async Task DescriptionEditAndNoOp_DoNotCreateUnnecessaryCascadeRevisions()
    {
        await _database.ResetAsync();
        var actor = await CreateActorAsync();
        var companion = await CreateAsync("Companion", [], actor);
        var target = await CreateAsync("Unchanged name", [companion.Id], actor);
        var input = UpdateInput(target, target.Name, [companion.Id]) with { Description = "Edited" };
        await using (var db = _database.CreateDbContext())
        {
            var updated = await new DbGameModifierRepository(db, TimeProvider.System)
                .UpdateModifierAsync(target.Id, input, actor);
            Assert.Equal(UpdateGameModifierRepositoryStatus.Updated, updated.Status);
            Assert.Single(updated.Changes!);
        }
        await using (var db = _database.CreateDbContext())
        {
            var unchanged = await new DbGameModifierRepository(db, TimeProvider.System)
                .UpdateModifierAsync(target.Id, input with { ExpectedRevision = 2 }, actor);
            Assert.Equal(UpdateGameModifierRepositoryStatus.Unchanged, unchanged.Status);
            Assert.True(unchanged.Changes is null or { Count: 0 });
        }
        await using var assertDb = _database.CreateDbContext();
        Assert.Equal(2, await assertDb.ModifierDefinitionVersions.CountAsync(x => x.ModifierId == companion.Id));
        Assert.Equal(2, await assertDb.ModifierDefinitionVersions.CountAsync(x => x.ModifierId == target.Id));
    }

    private async Task<ModifierChangeActor> CreateActorAsync()
    {
        await using var db = _database.CreateDbContext();
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;
        db.Users.Add(new User
        {
            Id = id,
            TwitchUserId = $"catalog-{id:N}",
            Login = "catalog-admin",
            DisplayName = "Catalog Admin",
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        });
        await db.SaveChangesAsync();
        return new ModifierChangeActor(id, "Catalog Admin");
    }

    private async Task<GameModifierDefinition> CreateAsync(
        string name, Guid[] conflicts, ModifierChangeActor actor)
    {
        await using var db = _database.CreateDbContext();
        var created = await new DbGameModifierRepository(db, TimeProvider.System).CreateModifierAsync(
            new CreateGameModifierInput(name, "Catalog regression test", GameModifierCategories.Round,
                1, new GameModifierActivationLimit(1), conflicts, null, "!test", [],
                BuiltInModifierBehaviorCatalog.Get(BuiltInModifierBehaviorCatalog.Chirik).Behavior), actor);
        Assert.Equal(CreateGameModifierRepositoryStatus.Created, created.Status);
        return Assert.IsType<GameModifierDefinition>(created.Modifier);
    }

    private static UpdateGameModifierInput UpdateInput(
        GameModifierDefinition definition, string name, Guid[] conflicts) =>
        new(name, definition.Description, definition.Category, definition.ActivationCost,
            definition.ActivationLimit, conflicts, definition.IconEmoji, definition.ActivationCommand,
            definition.NormalizedTags, definition.BehaviorV2, definition.Revision);
}
