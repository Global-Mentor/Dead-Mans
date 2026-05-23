using backend.Application.Abstractions.Auth;

namespace backend.Infrastructure.Auth;

/// <summary>
/// In the Testing environment, defers to the database when a user row exists and otherwise
/// treats authenticated test principals as active so integration tests can use synthetic user ids.
/// </summary>
public sealed class TestingAuthUserReader : IAuthUserReader
{
    private readonly DbAuthUserReader _dbAuthUserReader;

    public TestingAuthUserReader(DbAuthUserReader dbAuthUserReader)
    {
        _dbAuthUserReader = dbAuthUserReader;
    }

    public async Task<AuthUserSummary?> FindByIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _dbAuthUserReader.FindByIdAsync(userId, cancellationToken);
        if (user is not null)
        {
            return user;
        }

        return new AuthUserSummary(userId, "Test User", IsActive: true);
    }
}
