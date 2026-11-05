using backend.Infrastructure.Storage;
using SkiaSharp;

namespace Backend.Tests.Unit.Storage;

public sealed class QuizScreenshotImageProcessorTests
{
    [Theory]
    [InlineData(SKEncodedImageFormat.Png, "image/png")]
    [InlineData(SKEncodedImageFormat.Jpeg, "image/jpeg")]
    [InlineData(SKEncodedImageFormat.Webp, "image/webp")]
    public void DecodesFullImageAndProducesSmallPreview(SKEncodedImageFormat format, string mime)
    {
        using var bitmap = new SKBitmap(1920, 1080);
        bitmap.Erase(SKColors.Coral);
        using var image = SKImage.FromBitmap(bitmap);
        using var encoded = image.Encode(format, 90);
        using var input = new MemoryStream(encoded.ToArray());
        var thumbnail = QuizScreenshotImageProcessor.CreateThumbnail(input, mime);
        Assert.NotNull(thumbnail);
        Assert.Equal(0, input.Position);
        using var decoded = SKBitmap.Decode(thumbnail);
        Assert.Equal(320, decoded.Width);
        Assert.Equal(180, decoded.Height);
        Assert.InRange(decoded.GetPixel(100, 100).Red, (byte)245, (byte)255);
    }

    [Fact]
    public void RejectsSignatureOnlyTruncatedAndWrongMimeImages()
    {
        using var bitmap = new SKBitmap(32, 32);
        bitmap.Erase(SKColors.Coral);
        using var image = SKImage.FromBitmap(bitmap);
        using var encoded = image.Encode(SKEncodedImageFormat.Png, 100);
        var bytes = encoded.ToArray();
        using var signature = new MemoryStream(bytes[..8]);
        using var truncated = new MemoryStream(bytes[..(bytes.Length / 2)]);
        using var mismatched = new MemoryStream(bytes);
        Assert.Null(QuizScreenshotImageProcessor.CreateThumbnail(signature, "image/png"));
        Assert.Null(QuizScreenshotImageProcessor.CreateThumbnail(truncated, "image/png"));
        Assert.Null(QuizScreenshotImageProcessor.CreateThumbnail(mismatched, "image/jpeg"));
    }

    [Fact]
    public void RejectsAnimatedPngEvenWhenCodecReportsNoAnimation()
    {
        // Two APNG frames, red then blue. The PNG codec currently reports zero animation frames.
        var bytes = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAACGFjVEwAAAACAAAAAPONk3AAAAAaZmNUTAAAAAAAAAACAAAAAQAAAAAAAAAAAAEAAgAA9zrnwQAAAA5JREFUeJxj+M/A8B+EARH3A/3jxfXvAAAAGmZjVEwAAAABAAAAAgAAAAEAAAAAAAAAAAABAAIAAGxJDRUAAAASZmRBVAAAAAJ4nGNgYPj/H4QBDfsD/a6UELEAAAAASUVORK5CYII=");
        using var input = new MemoryStream(bytes);
        Assert.Null(QuizScreenshotImageProcessor.CreateThumbnail(input, "image/png"));
    }

    [Fact]
    public void AcceptsStaticPngWithAnimationMarkerInsideTextChunk()
    {
        var bytes = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAIXRFWHRjb21tZW50AGFjVEwgaXMgdGV4dCwgbm90IGEgY2h1bmvvDUKQAAAADklEQVR4nGP4z8DwH4QBEfcD/ePF9e8AAAAASUVORK5CYII=");
        using var input = new MemoryStream(bytes);
        Assert.NotNull(QuizScreenshotImageProcessor.CreateThumbnail(input, "image/png"));
    }

    [Fact]
    public void AppliesExifRotationToPreview()
    {
        using var bitmap = new SKBitmap(40, 20);
        using (var canvas = new SKCanvas(bitmap))
        {
            canvas.Clear(SKColors.Red);
            using var paint = new SKPaint { Color = SKColors.Blue };
            canvas.DrawRect(new SKRect(20, 0, 40, 20), paint);
        }
        using var image = SKImage.FromBitmap(bitmap);
        using var encoded = image.Encode(SKEncodedImageFormat.Jpeg, 100);
        // Little-endian EXIF IFD with orientation 6 (rotate 90 degrees clockwise).
        byte[] exif = [0xff, 0xe1, 0, 34, 69, 120, 105, 102, 0, 0,
            73, 73, 42, 0, 8, 0, 0, 0, 1, 0, 18, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0];
        var jpeg = encoded.ToArray();
        using var input = new MemoryStream([.. jpeg[..2], .. exif, .. jpeg[2..]]);
        var thumbnail = QuizScreenshotImageProcessor.CreateThumbnail(input, "image/jpeg");
        Assert.NotNull(thumbnail);
        using var decoded = SKBitmap.Decode(thumbnail);
        Assert.Equal(20, decoded.Width);
        Assert.Equal(40, decoded.Height);
        Assert.True(decoded.GetPixel(10, 5).Red > 200);
        Assert.True(decoded.GetPixel(10, 35).Blue > 200);
    }

    [Fact]
    public void RejectsDimensionsBeforeAllocatingDecodedPixels()
    {
        using var bitmap = new SKBitmap(QuizScreenshotImageProcessor.MaxDimension + 1, 1);
        using var image = SKImage.FromBitmap(bitmap);
        using var encoded = image.Encode(SKEncodedImageFormat.Png, 100);
        using var input = new MemoryStream(encoded.ToArray());
        Assert.Null(QuizScreenshotImageProcessor.CreateThumbnail(input, "image/png"));
    }
}
