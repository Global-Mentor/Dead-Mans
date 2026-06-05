using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed class DbGameLifecyclePersistence : IGameLifecyclePersistence
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<DbGameLifecyclePersistence> _logger;

    public DbGameLifecyclePersistence(
        ApplicationDbContext dbContext,
        ILogger<DbGameLifecyclePersistence> logger
    )
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<GameLifecycleResult> OpenRegistrationAsync(
        Guid draftGameId,
        CancellationToken cancellationToken = default
    )
    {
        var draft = await _dbContext.Games
            .Include(game => game.ParticipationSlots)
            .FirstOrDefaultAsync(game => game.Id == draftGameId, cancellationToken);
        if (draft is null)
        {
            return new GameLifecycleResult(false, null, GameLifecycleErrorCode.DraftNotFound);
        }

        await GameParticipationSlotInitializer.EnsureDefaultSlotsAsync(
            _dbContext,
            draft.Id,
            cancellationToken
        );

        if (!await _dbContext.GameParticipationSlots.AnyAsync(
                slot => slot.GameId == draft.Id,
                cancellationToken
            ))
        {
            return new GameLifecycleResult(
                false,
                draft.Id,
                GameLifecycleErrorCode.NoParticipationSlots
            );
        }

        var utcNow = DateTime.UtcNow;
        draft.Status = GameStatusValue.Ready;
        draft.ReadyAtUtc = utcNow;
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (PostgresUniqueViolation.TryGetConstraintName(ex, out var constraintName))
        {
            _logger.LogWarning(ex, "Open registration failed due to unique constraint {Constraint}.", constraintName);
            return MapLifecycleUniqueViolation(constraintName, draft.Id, GameLifecycleErrorCode.ReadyGameAlreadyExists);
        }

        _logger.LogInformation("Game {GameId} moved to ready for registration.", draft.Id);
        return new GameLifecycleResult(true, draft.Id, GameLifecycleErrorCode.None);
    }

    public async Task<GameLifecycleResult> StartGameAsync(
        Guid readyGameId,
        CancellationToken cancellationToken = default
    )
    {
        var ready = await _dbContext.Games
            .FirstOrDefaultAsync(game => game.Id == readyGameId, cancellationToken);
        if (ready is null)
        {
            return new GameLifecycleResult(false, null, GameLifecycleErrorCode.GameNotReady);
        }

        ready.Status = GameStatusValue.Active;
        ready.StartedAtUtc = DateTime.UtcNow;
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (PostgresUniqueViolation.TryGetConstraintName(ex, out var constraintName))
        {
            _logger.LogWarning(ex, "Start game failed due to unique constraint {Constraint}.", constraintName);
            return MapLifecycleUniqueViolation(constraintName, ready.Id, GameLifecycleErrorCode.ActiveGameAlreadyExists);
        }

        _logger.LogInformation("Game {GameId} started.", ready.Id);
        return new GameLifecycleResult(true, ready.Id, GameLifecycleErrorCode.None);
    }

    public async Task<GameLifecycleResult> FinishGameAsync(
        Guid activeGameId,
        CancellationToken cancellationToken = default
    )
    {
        var active = await _dbContext.Games
            .FirstOrDefaultAsync(game => game.Id == activeGameId, cancellationToken);
        if (active is null)
        {
            return new GameLifecycleResult(false, null, GameLifecycleErrorCode.GameNotActive);
        }

        var utcNow = DateTime.UtcNow;
        active.Status = GameStatusValue.Finished;
        active.FinishedAtUtc = utcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Game {GameId} finished.", active.Id);
        return new GameLifecycleResult(true, active.Id, GameLifecycleErrorCode.None);
    }

    private static GameLifecycleResult MapLifecycleUniqueViolation(
        string? constraintName,
        Guid gameId,
        GameLifecycleErrorCode fallbackConflict
    ) =>
        constraintName switch
        {
            PostgresUniqueViolation.GamesSingleReady => new GameLifecycleResult(
                false,
                gameId,
                GameLifecycleErrorCode.ReadyGameAlreadyExists
            ),
            PostgresUniqueViolation.GamesSingleActive => new GameLifecycleResult(
                false,
                gameId,
                GameLifecycleErrorCode.ActiveGameAlreadyExists
            ),
            _ => new GameLifecycleResult(false, gameId, fallbackConflict)
        };
}
