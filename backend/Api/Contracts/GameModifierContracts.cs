namespace backend.Api.Contracts;

public sealed record GameModifierDefinitionDto(
    string Code,
    string Kind,
    string Category,
    string ScoringType,
    string Tier,
    string Name,
    string Description,
    int ActivationCost,
    int? DefaultLimitPerGame,
    string? IconEmoji,
    string? ActivationCommand
);

public sealed record GameModifierActivationDto(
    string ModifierCode,
    string ActivatedByUserId,
    DateTime ActivatedAtUtc
);

public sealed record GameModifierActivatedEventDto(
    string GameId,
    int Version,
    GameModifierActivationDto Activation
);
