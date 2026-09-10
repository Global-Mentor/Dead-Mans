namespace backend.Api.Contracts;

public static class ErrorResponseFactory
{
    public static ErrorResponse Create(string error, string? code = null, string? requestId = null) =>
        new(error, code, requestId);

    public static Task WriteAsync(
        HttpResponse response,
        int statusCode,
        string error,
        string? code = null
    )
    {
        response.StatusCode = statusCode;
        return response.WriteAsJsonAsync(Create(error, code, response.HttpContext.TraceIdentifier));
    }
}
