using System.ComponentModel.DataAnnotations;

namespace backend.Infrastructure.Configuration;

public sealed class StorageOptions
{
    public const string SectionName = "Storage";
    [Required]
    public string PublicBaseUrl { get; set; } = string.Empty;

    [Required]
    public string BucketName { get; set; } = string.Empty;

    public string? AccessKey { get; set; }

    public string? SecretKey { get; set; }
}
