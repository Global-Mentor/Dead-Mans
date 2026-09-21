using Backend.Tests.Support;
using backend.Infrastructure.Twitch;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Backend.Tests.Integration.Postgres;

public sealed class TwitchPublicationLeaseTests(PostgresTestDatabase database) : IClassFixture<PostgresTestDatabase>
{
    [Fact]
    public async Task Lease_IsHeldAcrossCommits_AndReleasedOnDispose()
    {
        await using var db = database.CreateDbContext();
        await using var observer = new NpgsqlConnection(database.ConnectionString);
        await observer.OpenAsync();
        await using var command = observer.CreateCommand();
        // The fixed application-wide lock is also used by independent backend processes.
        command.CommandText = "SELECT pg_try_advisory_lock(@key)";
        command.Parameters.AddWithValue("key", 0x444D54575155495AL);
        await using (await TwitchPublicationLease.AcquireAsync(db, default))
        {
            await using (var transaction = await db.Database.BeginTransactionAsync())
                await transaction.CommitAsync();
            Assert.False((bool)(await command.ExecuteScalarAsync())!);
        }
        Assert.True((bool)(await command.ExecuteScalarAsync())!);
        command.CommandText = "SELECT pg_advisory_unlock(@key)";
        Assert.True((bool)(await command.ExecuteScalarAsync())!);
    }
}
