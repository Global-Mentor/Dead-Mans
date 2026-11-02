namespace backend.Data.Entities;

public sealed class HuntLocation
{
    public Guid Id { get; set; }
    public Guid MapId { get; set; }
    public string Code { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public HuntMap Map { get; set; } = default!;
    public ICollection<HuntLocationTranslation> Translations { get; set; } = new List<HuntLocationTranslation>();
}
