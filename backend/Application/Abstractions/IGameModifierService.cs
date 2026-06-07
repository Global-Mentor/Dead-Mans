using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public enum ActivateGameModifierOutcome
{
    Activated,
    UnknownModifierCode,
    GameNotActive,
    ModifierNotEnabled,
    ModifierConflictActive,
    ModifierLimitReached,
    UserNotResolved
}

public sealed record ActivateGameModifierResult(
    ActivateGameModifierOutcome Outcome,
    GameModifierActivatedEvent? Event = null
);

public interface IGameModifierService
{
    Task<IReadOnlyList<GameModifierDefinition>> GetCatalogAsync(
        CancellationToken cancellationToken = default
    );

    Task<ActivateGameModifierResult> ActivateAsync(
        string modifierCode,
        Guid? activatedByUserId,
        CancellationToken cancellationToken = default
    );
}
