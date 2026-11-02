namespace backend.Data.Entities;

public sealed class HuntLocationTranslation
{
    public Guid LocationId { get; set; }
    public string Locale { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public HuntLocation Location { get; set; } = default!;
}
