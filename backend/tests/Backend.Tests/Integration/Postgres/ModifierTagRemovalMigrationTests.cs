using backend.Data;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace Backend.Tests.Integration.Postgres;

public sealed class ModifierTagRemovalMigrationTests : IClassFixture<PostgresTestDatabase>
{
    private readonly PostgresTestDatabase _database;

    public ModifierTagRemovalMigrationTests(PostgresTestDatabase database)
    {
        _database = database;
    }

    [Fact]
    public async Task Upgrade_WithExistingTaggedRevision_PreservesContentAndImmutableGuards()
    {
        await using var db = _database.CreateDbContext();
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("20261008122259_AllowAdminTeamUnconfirmation");

        var modifierId = ModifierDefinitionSeedIds.Chirik;
        var versionId = Guid.NewGuid();
        await using var connection = new NpgsqlConnection(_database.ConnectionString);
        await connection.OpenAsync();
        await using (var insert = connection.CreateCommand())
        {
            insert.CommandText =
                """
                INSERT INTO modifier_definition_versions (
                    id, modifier_id, revision, name, description, category, icon_emoji,
                    activation_command, activation_cost, max_activations_per_round,
                    normalized_tags, behavior_v2_json, created_at_utc,
                    created_by_display_name_snapshot, change_type, changed_fields
                )
                SELECT @version_id, modifier_id, 2, name, description, category, icon_emoji,
                    activation_command, activation_cost, max_activations_per_round,
                    ARRAY['obsolete']::text[], behavior_v2_json, created_at_utc,
                    created_by_display_name_snapshot, 'edited', ARRAY['normalizedTags']::text[]
                FROM modifier_definition_versions
                WHERE modifier_id = @modifier_id AND revision = 1;

                UPDATE modifier_definitions SET current_version_id = @version_id
                WHERE id = @modifier_id;
                """;
            insert.Parameters.AddWithValue("version_id", versionId);
            insert.Parameters.AddWithValue("modifier_id", modifierId);
            await insert.ExecuteNonQueryAsync();
        }

        var before = await db.ModifierDefinitionVersions.AsNoTracking()
            .Where(version => version.ModifierId == modifierId)
            .OrderBy(version => version.Revision)
            .Select(version => new
            {
                version.Id,
                version.Revision,
                version.Name,
                version.Description,
                version.ActivationCost,
                version.BehaviorV2Json,
                version.ChangedFields
            }).ToArrayAsync();

        await migrator.MigrateAsync();

        var after = await db.ModifierDefinitionVersions.AsNoTracking()
            .Where(version => version.ModifierId == modifierId)
            .OrderBy(version => version.Revision)
            .Select(version => new
            {
                version.Id,
                version.Revision,
                version.Name,
                version.Description,
                version.ActivationCost,
                version.BehaviorV2Json,
                version.ChangedFields
            }).ToArrayAsync();
        Assert.Equal(2, after.Length);
        for (var index = 0; index < before.Length; index++)
        {
            Assert.Equal(before[index].Id, after[index].Id);
            Assert.Equal(before[index].Revision, after[index].Revision);
            Assert.Equal(before[index].Name, after[index].Name);
            Assert.Equal(before[index].Description, after[index].Description);
            Assert.Equal(before[index].ActivationCost, after[index].ActivationCost);
            Assert.Equal(before[index].BehaviorV2Json, after[index].BehaviorV2Json);
            Assert.Equal(before[index].ChangedFields, after[index].ChangedFields);
        }
        Assert.Equal(versionId, await db.ModifierDefinitions
            .Where(definition => definition.Id == modifierId)
            .Select(definition => definition.CurrentVersionId).SingleAsync());

        await using (var schema = connection.CreateCommand())
        {
            schema.CommandText =
                """
                SELECT count(*) FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND (table_name, column_name) IN (
                      ('modifier_definition_versions', 'normalized_tags'),
                      ('game_modifier_activations', 'normalized_tags_snapshot'),
                      ('game_round_modifier_results', 'modifier_normalized_tags_snapshot')
                  );
                """;
            Assert.Equal(0L, await schema.ExecuteScalarAsync());
        }
        await using (var guards = connection.CreateCommand())
        {
            guards.CommandText =
                """
                SELECT count(*) FROM pg_proc
                WHERE proname IN (
                    'deadmans_validate_modifier_activation_update',
                    'deadmans_validate_modifier_result_update',
                    'deadmans_assert_modifier_activation'
                ) AND pg_get_functiondef(oid) LIKE '%normalized_tags%';
                """;
            Assert.Equal(0L, await guards.ExecuteScalarAsync());
        }

        await using var mutation = connection.CreateCommand();
        mutation.CommandText = "UPDATE modifier_definition_versions SET name = 'Tampered' WHERE id = @id";
        mutation.Parameters.AddWithValue("id", versionId);
        var error = await Assert.ThrowsAsync<PostgresException>(() => mutation.ExecuteNonQueryAsync());
        Assert.Equal("55000", error.SqlState);
    }
}
