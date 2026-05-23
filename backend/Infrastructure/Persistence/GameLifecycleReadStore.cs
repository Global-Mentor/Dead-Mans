using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed class GameLifecycleReadStore : IGameLifecycleReadStore
{
    private readonly ApplicationDbContext _dbContext;

    public GameLifecycleReadStore(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<DraftGameLifecycleContext?> GetLatestDraftForOpenAsync(CancellationToken cancellationToken) =>
        _dbContext.Games
            .AsNoTracking()
            .Where(game => game.Status == GameStatusValue.Draft)
            .OrderByDescending(game => game.CreatedAtUtc)
            .Select(
                game => new DraftGameLifecycleContext(
                    game.Id,
                    game.MinPlayersPerTeam,
                    game.MaxPlayersPerTeam
                )
            )
            .FirstOrDefaultAsync(cancellationToken);

    public Task<bool> AnyReadyGameAsync(CancellationToken cancellationToken) =>
        _dbContext.Games.AnyAsync(game => game.Status == GameStatusValue.Ready, cancellationToken);

    public Task<bool> AnyActiveGameAsync(CancellationToken cancellationToken) =>
        _dbContext.Games.AnyAsync(game => game.Status == GameStatusValue.Active, cancellationToken);

    public Task<Guid?> GetReadyGameIdForStartAsync(CancellationToken cancellationToken) =>
        _dbContext.Games
            .AsNoTracking()
            .Where(game => game.Status == GameStatusValue.Ready)
            .OrderByDescending(game => game.ReadyAtUtc)
            .Select(game => (Guid?)game.Id)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<Guid?> GetActiveGameIdForFinishAsync(CancellationToken cancellationToken) =>
        _dbContext.Games
            .AsNoTracking()
            .Where(game => game.Status == GameStatusValue.Active)
            .OrderByDescending(game => game.StartedAtUtc)
            .Select(game => (Guid?)game.Id)
            .FirstOrDefaultAsync(cancellationToken);
}
