namespace backend.Data.Entities;

public class GameModifierSelection
{
    public Guid GameId { get; set; }

    public string ModifierCode { get; set; } = string.Empty;

    public DateTime EnabledAtUtc { get; set; }

    public Game Game { get; set; } = default!;

    public ModifierDefinition ModifierDefinition { get; set; } = default!;
}
