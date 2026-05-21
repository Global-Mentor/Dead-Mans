using System.ComponentModel.DataAnnotations;

namespace backend.Application.Configuration;

public sealed class MediaStorageSettings
{
    public const string SectionName = "Storage";

    [Required]
    public string PublicBaseUrl { get; set; } = string.Empty;

    [Required]
    public string BucketName { get; set; } = string.Empty;

    [Required]
    public string GamesPrefix { get; set; } = string.Empty;

    [Required]
    public string CardsGroup { get; set; } = string.Empty;
}
