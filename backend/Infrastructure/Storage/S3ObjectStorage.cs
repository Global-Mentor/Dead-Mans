using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using backend.Application.Abstractions;
using backend.Infrastructure.Configuration;
using Microsoft.Extensions.Options;

namespace backend.Infrastructure.Storage;

public sealed class S3ObjectStorage : IObjectStorage
{
    private readonly StorageOptions _options;

    public S3ObjectStorage(IOptions<StorageOptions> options)
    {
        _options = options.Value;
    }

    public async Task PutObjectAsync(
        string bucketName,
        string objectKey,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default
    )
    {
        using var client = CreateClient();
        await client.PutObjectAsync(
            new PutObjectRequest
            {
                BucketName = bucketName,
                Key = objectKey,
                InputStream = content,
                AutoCloseStream = false,
                ContentType = contentType,
            },
            cancellationToken
        );
    }

    public async Task DeleteObjectAsync(
        string bucketName,
        string objectKey,
        CancellationToken cancellationToken = default
    )
    {
        using var client = CreateClient();
        await client.DeleteObjectAsync(bucketName, objectKey, cancellationToken);
    }

    private IAmazonS3 CreateClient()
    {
        if (string.IsNullOrWhiteSpace(_options.AccessKey) || string.IsNullOrWhiteSpace(_options.SecretKey))
        {
            throw new InvalidOperationException(
                "Storage credentials are not configured. Set Storage:AccessKey/SecretKey or MINIO_ROOT_USER/MINIO_ROOT_PASSWORD."
            );
        }

        var credentials = new BasicAWSCredentials(_options.AccessKey, _options.SecretKey);
        var config = new AmazonS3Config
        {
            ServiceURL = _options.PublicBaseUrl.TrimEnd('/'),
            ForcePathStyle = true,
        };
        return new AmazonS3Client(credentials, config);
    }
}
