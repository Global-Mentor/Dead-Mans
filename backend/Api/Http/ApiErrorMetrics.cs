using System.Diagnostics.Metrics;

namespace backend.Api.Http;

public static class ApiErrorMetrics
{
    private static readonly Meter Meter = new("backend.api.errors", "1.0.0");
    private static readonly Counter<long> ErrorResponsesCounter = Meter.CreateCounter<long>(
        "backend.api.error_responses.total"
    );

    public static void Record(int statusCode, string? code, string source)
    {
        ErrorResponsesCounter.Add(
            1,
            new KeyValuePair<string, object?>("status_code", statusCode),
            new KeyValuePair<string, object?>("error_code", code ?? string.Empty),
            new KeyValuePair<string, object?>("source", source)
        );
    }
}
