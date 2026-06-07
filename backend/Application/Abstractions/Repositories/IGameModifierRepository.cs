using backend.Application.Contracts;

namespace backend.Application.Abstractions.Repositories;

public enum ActivateGameModifierRepositoryStatus
{
    Activated,
    UnknownModifierCode,
    GameNotActive,
    ModifierNotEnabled,
    ModifierConflictActive,
    ModifierLimitReached
}

public sealed record ActivateGameModifierRepositoryResult(
    ActivateGameModifierRepositoryStatus Status,
    string? GameId = null,
    int? Version = null,
    GameModifierActivation? Activation = null
);

public interface IGameModifierRepository
{
    Task<IReadOnlyList<GameModifierDefinition>> GetCatalogAsync(
        CancellationToken cancellationToken = default
    );

    Task<bool> ModifierCodeExistsAsync(string modifierCode, CancellationToken cancellationToken = default);

    Task<bool> ModifierCodesExistAsync(
        IReadOnlyList<string> modifierCodes,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<string>> GetEnabledModifierCodesForGameAsync(
        Guid gameId,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<GameModifierActivation>> GetActiveModifiersForGameAsync(
        Guid gameId,
        CancellationToken cancellationToken = default
    );

    Task<ActivateGameModifierRepositoryResult> ActivateModifierAsync(
        string modifierCode,
        Guid activatedByUserId,
        CancellationToken cancellationToken = default
    );
}
