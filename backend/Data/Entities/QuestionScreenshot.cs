namespace backend.Data.Entities;

public sealed class QuestionScreenshot
{
    public Guid QuestionId { get; set; }
    public Guid LocationId { get; set; }
    public Guid MediaAssetId { get; set; }
    public Guid UploadRequestId { get; set; }
    public string UploadFingerprint { get; set; } = string.Empty;
    public QuestionDefinition Question { get; set; } = default!;
    public HuntLocation Location { get; set; } = default!;
    public MediaAsset MediaAsset { get; set; } = default!;
}
