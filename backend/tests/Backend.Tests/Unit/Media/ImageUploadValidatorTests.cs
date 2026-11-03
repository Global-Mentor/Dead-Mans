using backend.Application.Media;

namespace Backend.Tests.Unit.Media;

public sealed class ImageUploadValidatorTests
{
    [Theory]
    [InlineData("image/png", 1024, true)]
    [InlineData("image/jpeg", 1024, true)]
    [InlineData("image/webp", 1024, true)]
    [InlineData("image/gif", 1024, true)]
    [InlineData("application/pdf", 1024, false)]
    [InlineData("image/png", 0, false)]
    [InlineData("image/png", ImageUploadLimits.MaxUploadBytes + 1, false)]
    public void IsAllowedUpload_EnforcesMimeAndSize(string mimeType, long length, bool expected)
    {
        var allowed = ImageUploadValidator.IsAllowedUpload(mimeType, length, out var normalized);

        Assert.Equal(expected, allowed);
        if (expected)
        {
            Assert.Equal(mimeType, normalized);
        }
    }

    public static TheoryData<string, byte[], bool> FileSignatures => new()
    {
        { "image/jpeg", [0xff, 0xd8, 0xff, 0xe0, 0x00], true },
        { "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], true },
        { "image/gif", "GIF87a"u8.ToArray(), true },
        { "image/gif", "GIF89a"u8.ToArray(), true },
        { "image/webp", [0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50], true },
        { "image/png", "not-an-image"u8.ToArray(), false },
        { "image/jpeg", [0xff, 0xd8], false },
        { "application/octet-stream", [0xff, 0xd8, 0xff], false },
    };

    [Theory]
    [MemberData(nameof(FileSignatures))]
    public void HasMatchingFileSignature_ValidatesContentAndRestoresStreamPosition(
        string mimeType,
        byte[] content,
        bool expected
    )
    {
        using var stream = new MemoryStream(content);

        var matches = ImageUploadValidator.HasMatchingFileSignature(stream, mimeType);

        Assert.Equal(expected, matches);
        Assert.Equal(0, stream.Position);
    }
}
