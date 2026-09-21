using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Twitch;

// Session lock, not transaction lock: the durable "sending" marker must commit
// before the external HTTP request so a restart cannot silently send it twice.
internal sealed class TwitchPublicationLease : IAsyncDisposable
{
    private static readonly SemaphoreSlim LocalGate = new(1, 1);
    private readonly ApplicationDbContext _db;
    private readonly bool _relational;
    private const long LockId = 0x444D54575155495A;

    private TwitchPublicationLease(ApplicationDbContext db)
    {
        _db = db;
        _relational = db.Database.IsRelational();
    }

    public static async Task<TwitchPublicationLease> AcquireAsync(ApplicationDbContext db, CancellationToken cancellationToken)
    {
        await LocalGate.WaitAsync(cancellationToken);
        var lease = new TwitchPublicationLease(db);
        try
        {
            if (lease._relational)
            {
                await db.Database.OpenConnectionAsync(cancellationToken);
                await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_lock({LockId})", cancellationToken);
            }
            return lease;
        }
        catch
        {
            try { if (lease._relational) await db.Database.CloseConnectionAsync(); }
            finally { LocalGate.Release(); }
            throw;
        }
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            if (_relational)
            {
                try { await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_unlock({LockId})", CancellationToken.None); }
                finally { await _db.Database.CloseConnectionAsync(); }
            }
        }
        finally { LocalGate.Release(); }
    }
}
