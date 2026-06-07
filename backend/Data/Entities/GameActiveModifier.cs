namespace backend.Data.Entities;

public class GameActiveModifier
{
    public Guid Id { get; set; }

    public Guid GameId { get; set; }

    public string ModifierCode { get; set; } = string.Empty;

    public Guid ActivatedByUserId { get; set; }

    public DateTime ActivatedAtUtc { get; set; }

    public Game Game { get; set; } = default!;

    public ModifierDefinition ModifierDefinition { get; set; } = default!;
}
