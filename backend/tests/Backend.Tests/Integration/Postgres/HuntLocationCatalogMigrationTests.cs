using System.Security.Cryptography;
using System.Text;
using backend.Data;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace Backend.Tests.Integration.Postgres;

public sealed class HuntLocationCatalogMigrationTests(PostgresTestDatabase database)
    : IClassFixture<PostgresTestDatabase>
{
    private const string CatalogMigration = "20261102173557_AddHuntLocationCatalog";
    private const string PreviousMigration = "20261102023047_AddOverlayQuizLeaderboard";
    // Independently calculated from the client XML, including all four locales.
    private const string ClientNamesSha256 = "e73312a94ceff67aa37692d56c657740a6abfd6f1d0ff11745c9eb8198702ab0";

    [Fact]
    public async Task Migration_SeedsExactClientNamesAndCompleteMapMembership()
    {
        await using var db = database.CreateDbContext();
        var maps = await db.HuntMaps.AsNoTracking().Include(map => map.Translations)
            .Include(map => map.Locations).ThenInclude(location => location.Translations)
            .AsSplitQuery().OrderBy(map => map.Code).ToArrayAsync();

        Assert.Equal(["cemetery", "civilwar", "colorado", "creek"], maps.Select(map => map.Code));
        foreach (var map in maps)
        {
            Assert.True(map.IsEnabled);
            Assert.Equal(["en", "pl", "ru", "uk"], map.Translations.Select(row => row.Locale).Order());
            Assert.Equal(16, map.Locations.Count);
            Assert.Equal(Enumerable.Range('a', 13).Select(letter => $"com_{(char)letter}")
                    .Concat(["poi_a", "poi_b", "poi_c"]),
                map.Locations.Select(location => location.Code).Order());
            foreach (var location in map.Locations)
            {
                Assert.True(location.IsEnabled);
                Assert.Equal(map.Id, location.MapId);
                Assert.Equal(["en", "pl", "ru", "uk"], location.Translations.Select(row => row.Locale).Order());
            }
            foreach (var locale in new[] { "en", "ru", "uk", "pl" })
            {
                Assert.Equal(16, map.Locations.SelectMany(location => location.Translations)
                    .Where(row => row.Locale == locale).Select(row => row.Name).Distinct().Count());
            }
        }
        Assert.Equal(ClientNamesSha256, await NamesHashAsync(db));
    }

    [Fact]
    public async Task MigrateAgain_DoesNotOverwriteCatalogOrChangeIdentities()
    {
        await using var db = database.CreateDbContext();
        var map = await db.HuntMaps.SingleAsync(row => row.Code == "creek");
        var translation = await db.HuntMapTranslations.SingleAsync(row => row.MapId == map.Id && row.Locale == "ru");
        var originalName = translation.Name;
        var originalId = map.Id;
        try
        {
            map.IsEnabled = false;
            translation.Name = "Проверка сохранения исправления";
            await db.SaveChangesAsync();
            await db.Database.MigrateAsync();
            db.ChangeTracker.Clear();
            var persistedMap = await db.HuntMaps.SingleAsync(row => row.Code == "creek");
            Assert.Equal(originalId, persistedMap.Id);
            Assert.False(persistedMap.IsEnabled);
            Assert.Equal("Проверка сохранения исправления", await db.HuntMapTranslations
                .Where(row => row.MapId == originalId && row.Locale == "ru").Select(row => row.Name).SingleAsync());
            Assert.Equal(64, await db.HuntLocations.CountAsync());
        }
        finally
        {
            await db.HuntMaps.Where(row => row.Id == originalId)
                .ExecuteUpdateAsync(update => update.SetProperty(row => row.IsEnabled, true));
            await db.HuntMapTranslations.Where(row => row.MapId == originalId && row.Locale == "ru")
                .ExecuteUpdateAsync(update => update.SetProperty(row => row.Name, originalName));
        }
    }

    [Fact]
    public async Task RollbackAndUpgrade_PreserveExistingCatalogAndRestoreStableLocationIds()
    {
        await using var db = database.CreateDbContext();
        var idsBefore = await db.HuntLocations.OrderBy(row => row.Id).Select(row => row.Id).ToArrayAsync();
        var categoryId = Guid.NewGuid();
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO question_categories (id, name, created_at_utc, updated_at_utc)
            VALUES ({categoryId}, 'Catalog migration preservation test', TIMESTAMPTZ '2026-01-01 00:00:00Z', TIMESTAMPTZ '2026-01-01 00:00:00Z')
            """);
        var migrator = db.GetService<IMigrator>();
        try
        {
            await migrator.MigrateAsync(PreviousMigration);
            Assert.DoesNotContain(CatalogMigration, await db.Database.GetAppliedMigrationsAsync());
            Assert.True(await db.QuestionCategories.AnyAsync(row => row.Id == categoryId));
            await migrator.MigrateAsync();
            Assert.True(await db.QuestionCategories.AnyAsync(row => row.Id == categoryId));
            Assert.Equal(idsBefore, await db.HuntLocations.OrderBy(row => row.Id).Select(row => row.Id).ToArrayAsync());
            Assert.Equal(ClientNamesSha256, await NamesHashAsync(db));
        }
        finally
        {
            await migrator.MigrateAsync();
            await db.QuestionCategories.Where(row => row.Id == categoryId).ExecuteDeleteAsync();
        }
    }

    [Theory]
    [InlineData("INSERT INTO hunt_maps (id, code, is_enabled) VALUES (gen_random_uuid(), 'cemetery', true)", PostgresErrorCodes.UniqueViolation)]
    [InlineData("INSERT INTO hunt_maps (id, code, is_enabled) VALUES (gen_random_uuid(), ' ', true)", PostgresErrorCodes.CheckViolation)]
    [InlineData("INSERT INTO hunt_locations (id, map_id, code, is_enabled) SELECT gen_random_uuid(), map_id, code, true FROM hunt_locations LIMIT 1", PostgresErrorCodes.UniqueViolation)]
    [InlineData("INSERT INTO hunt_locations (id, map_id, code, is_enabled) VALUES (gen_random_uuid(), gen_random_uuid(), 'com_a', true)", PostgresErrorCodes.ForeignKeyViolation)]
    [InlineData("INSERT INTO hunt_map_translations (map_id, locale, name) SELECT id, 'xx', 'Test' FROM hunt_maps LIMIT 1", PostgresErrorCodes.CheckViolation)]
    [InlineData("INSERT INTO hunt_location_translations (location_id, locale, name) SELECT id, 'xx', 'Test' FROM hunt_locations LIMIT 1", PostgresErrorCodes.CheckViolation)]
    [InlineData("UPDATE hunt_map_translations SET name = E' \t\n' WHERE locale = 'en'", PostgresErrorCodes.CheckViolation)]
    [InlineData("UPDATE hunt_location_translations SET name = '' WHERE locale = 'ru'", PostgresErrorCodes.CheckViolation)]
    [InlineData("DELETE FROM hunt_maps WHERE code = 'cemetery'", PostgresErrorCodes.ForeignKeyViolation)]
    [InlineData("DELETE FROM hunt_locations WHERE code = 'poi_a'", PostgresErrorCodes.ForeignKeyViolation)]
    public async Task Database_RejectsInvalidCatalogWrites(string sql, string expectedSqlState)
    {
        await using var db = database.CreateDbContext();
        await using var transaction = await db.Database.BeginTransactionAsync();
        var error = await Assert.ThrowsAsync<PostgresException>(() => db.Database.ExecuteSqlRawAsync(sql));
        Assert.Equal(expectedSqlState, error.SqlState);
        await transaction.RollbackAsync();
    }

    private static async Task<string> NamesHashAsync(ApplicationDbContext db)
    {
        var maps = await db.HuntMapTranslations.AsNoTracking()
            .Select(row => new { MapCode = row.Map.Code, row.Locale, row.Name }).ToArrayAsync();
        var locations = await db.HuntLocationTranslations.AsNoTracking()
            .Select(row => new { MapCode = row.Location.Map.Code, row.Location.Code, row.Locale, row.Name }).ToArrayAsync();
        var lines = maps.Select(row => $"{row.MapCode}|map|{row.Locale}|{row.Name}")
            .Concat(locations.Select(row => $"{row.MapCode}|{row.Code}|{row.Locale}|{row.Name}"))
            .Order(StringComparer.Ordinal);
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(string.Join('\n', lines) + "\n")));
    }
}
