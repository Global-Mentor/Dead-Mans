namespace backend.Data.Entities;

public sealed class HuntMapTranslation
{
    public Guid MapId { get; set; }
    public string Locale { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public HuntMap Map { get; set; } = default!;
}
