namespace backend.Data.Entities;

public sealed class HuntMap
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public ICollection<HuntMapTranslation> Translations { get; set; } = new List<HuntMapTranslation>();
    public ICollection<HuntLocation> Locations { get; set; } = new List<HuntLocation>();
}
