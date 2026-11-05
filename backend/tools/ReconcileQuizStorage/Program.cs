using System.Data;
using System.Text.Json;
using Amazon.Runtime;
using Amazon.S3;
using backend.Data;
using backend.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

if (args.Length != 0)
{
    Console.Error.WriteLine("This read-only diagnostic takes configuration from environment variables. See backend/tools/ReconcileQuizStorage/README.md.");
    return 1;
}

try
{
    var connection = Required("QUIZ_STORAGE_AUDIT_DATABASE");
    var endpoint = Required("QUIZ_STORAGE_AUDIT_ENDPOINT");
    var bucket = Required("QUIZ_STORAGE_AUDIT_BUCKET");
    var accessKey = Required("QUIZ_STORAGE_AUDIT_ACCESS_KEY");
    var secretKey = Required("QUIZ_STORAGE_AUDIT_SECRET_KEY");
    if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme is not ("https" or "http"))
    {
        throw new ArgumentException("QUIZ_STORAGE_AUDIT_ENDPOINT must be an absolute HTTP(S) endpoint.");
    }

    using var cancellation = new CancellationTokenSource();
    Console.CancelKeyPress += (_, eventArgs) => { eventArgs.Cancel = true; cancellation.Cancel(); };
    await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseNpgsql(connection).Options);
    using var storage = new AmazonS3Client(new BasicAWSCredentials(accessKey, secretKey),
        new AmazonS3Config { ServiceURL = endpoint, ForcePathStyle = true });

    // The database itself enforces read-only access even when an overly privileged account is supplied.
    await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, cancellation.Token);
    await db.Database.ExecuteSqlRawAsync("SET TRANSACTION READ ONLY", cancellation.Token);
    var report = await new QuizStorageReconciler(db, storage).ScanAsync(bucket, cancellation.Token);
    await transaction.RollbackAsync(cancellation.Token);
    Console.WriteLine(JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }));
    return report.Findings.Count == 0 ? 0 : 2;
}
catch (OperationCanceledException)
{
    Console.Error.WriteLine("Scan cancelled; no complete report was produced.");
    return 1;
}
catch (Exception exception)
{
    // Provider exception messages may contain credentials or connection details.
    Console.Error.WriteLine($"Scan failed ({exception.GetType().Name}); no complete report was produced. Check configuration and read-only access.");
    return 1;
}

static string Required(string name) => Environment.GetEnvironmentVariable(name) is { Length: > 0 } value
    ? value : throw new ArgumentException($"Missing {name}.");
