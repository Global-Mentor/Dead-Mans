using System.Buffers.Binary;
using SkiaSharp;

namespace backend.Infrastructure.Storage;

internal static class QuizScreenshotImageProcessor
{
    internal const int MaxDimension = 8192;
    internal const long MaxPixels = 40_000_000;

    // Decode the entire static image before accepting it. Header inspection alone accepts
    // truncated images, while dimensions must be bounded before allocating pixel memory.
    public static byte[]? CreateThumbnail(Stream content, string contentType)
    {
        // Skia's PNG decoder exposes APNG as a single static frame. Inspect chunk boundaries
        // so animated originals cannot pass validation while their previews show only frame one.
        if (contentType == "image/png" && !IsStaticPng(content)) return null;
        content.Position = 0;
        using var stream = new SKManagedStream(content, false);
        using var codec = SKCodec.Create(stream);
        if (codec is null) return null;
        var expected = contentType switch
        {
            "image/png" => SKEncodedImageFormat.Png,
            "image/jpeg" => SKEncodedImageFormat.Jpeg,
            "image/gif" => SKEncodedImageFormat.Gif,
            "image/webp" => SKEncodedImageFormat.Webp,
            _ => (SKEncodedImageFormat?)null
        };
        var info = codec.Info;
        if (codec.EncodedFormat != expected || codec.FrameCount > 1
            || info.Width <= 0 || info.Height <= 0
            || info.Width > MaxDimension || info.Height > MaxDimension
            || (long)info.Width * info.Height > MaxPixels) return null;
        using var bitmap = new SKBitmap(new SKImageInfo(info.Width, info.Height, SKColorType.Rgba8888, SKAlphaType.Premul));
        if (codec.GetPixels(bitmap.Info, bitmap.GetPixels()) != SKCodecResult.Success) return null;
        var rotated = codec.EncodedOrigin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop
            or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;
        var width = rotated ? info.Height : info.Width;
        var height = rotated ? info.Width : info.Height;
        var scale = Math.Min(1d, Math.Min(320d / width, 180d / height));
        using var surface = SKSurface.Create(new SKImageInfo(Math.Max(1, (int)Math.Round(width * scale)),
            Math.Max(1, (int)Math.Round(height * scale)), SKColorType.Rgba8888, SKAlphaType.Premul));
        var canvas = surface.Canvas;
        canvas.Clear(SKColors.Transparent);
        canvas.Scale((float)scale);
        switch (codec.EncodedOrigin)
        {
            case SKEncodedOrigin.TopRight: canvas.Translate(width, 0); canvas.Scale(-1, 1); break;
            case SKEncodedOrigin.BottomRight: canvas.Translate(width, height); canvas.RotateDegrees(180); break;
            case SKEncodedOrigin.BottomLeft: canvas.Translate(0, height); canvas.Scale(1, -1); break;
            case SKEncodedOrigin.LeftTop: canvas.RotateDegrees(90); canvas.Scale(1, -1); break;
            case SKEncodedOrigin.RightTop: canvas.Translate(width, 0); canvas.RotateDegrees(90); break;
            case SKEncodedOrigin.RightBottom: canvas.Translate(width, height); canvas.RotateDegrees(90); canvas.Scale(-1, 1); break;
            case SKEncodedOrigin.LeftBottom: canvas.Translate(0, height); canvas.RotateDegrees(-90); break;
        }
        using var image = SKImage.FromBitmap(bitmap);
        canvas.DrawImage(image, 0, 0, new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear));
        using var thumbnail = surface.Snapshot();
        using var encoded = thumbnail.Encode(SKEncodedImageFormat.Webp, 80);
        content.Position = 0;
        return encoded.ToArray();
    }

    private static bool IsStaticPng(Stream content)
    {
        content.Position = 8;
        Span<byte> header = stackalloc byte[8];
        while (content.Position <= content.Length - 12)
        {
            content.ReadExactly(header);
            var length = BinaryPrimitives.ReadUInt32BigEndian(header);
            if (length > content.Length - content.Position - 4) return false;
            var type = header[4..];
            if (type.SequenceEqual("acTL"u8)) return false;
            content.Position += length + 4L;
            if (type.SequenceEqual("IEND"u8)) return length == 0;
        }
        return false;
    }
}
