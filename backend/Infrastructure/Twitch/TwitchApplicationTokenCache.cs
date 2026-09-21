namespace backend.Infrastructure.Twitch;

// Shared across scoped HTTP clients. User refresh tokens remain encrypted in the database.
internal sealed class TwitchApplicationTokenCache : IDisposable
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private string? _token;
    private DateTimeOffset _expiresAt;

    public void Dispose() => _gate.Dispose();

    public async Task<string> GetAsync(TimeProvider clock,
        Func<Task<(string Token, int ExpiresIn)>> acquire, CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            if (_token is not null && clock.GetUtcNow() < _expiresAt) return _token;
            var grant = await acquire();
            if (string.IsNullOrWhiteSpace(grant.Token) || grant.ExpiresIn <= 0)
                throw new InvalidOperationException("Twitch application token response is invalid.");
            _token = grant.Token;
            _expiresAt = clock.GetUtcNow().AddSeconds(Math.Max(1, grant.ExpiresIn - 60));
            return _token;
        }
        finally { _gate.Release(); }
    }

    public async Task InvalidateAsync(string token, CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);
        try { if (_token == token) _token = null; }
        finally { _gate.Release(); }
    }
}
