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

    public async Task DeleteObjectsByPrefixAsync(
        string bucketName,
        string keyPrefix,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(keyPrefix))
        {
            throw new ArgumentException("Object key prefix is required.", nameof(keyPrefix));
        }

        using var client = CreateClient();
        var listRequest = new ListObjectsV2Request
        {
            BucketName = bucketName,
            Prefix = keyPrefix.TrimStart('/'),
        };

        while (true)
        {
            var listed = await client.ListObjectsV2Async(listRequest, cancellationToken);
            if (listed.S3Objects.Count == 0)
            {
                return;
            }

            await client.DeleteObjectsAsync(
                new DeleteObjectsRequest
                {
                    BucketName = bucketName,
                    Objects = listed.S3Objects
                        .Select(item => new KeyVersion { Key = item.Key })
                        .ToList(),
                },
                cancellationToken
            );

            if (!listed.IsTruncated)
            {
                return;
            }

            listRequest.ContinuationToken = listed.NextContinuationToken;
        }
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
