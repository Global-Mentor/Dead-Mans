namespace backend.Data.Entities;

public class ModifierConflict
{
    public string ModifierCode { get; set; } = string.Empty;

    public string ConflictsWithModifierCode { get; set; } = string.Empty;

    public ModifierDefinition Modifier { get; set; } = default!;

    public ModifierDefinition ConflictsWithModifier { get; set; } = default!;
}
