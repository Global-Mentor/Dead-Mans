using backend.Api.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Backend.Tests.Unit.Infrastructure;

public sealed class ApiExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_RemovesLineBreaksFromRequestDataBeforeLogging()
    {
        var logger = new CapturingLogger<ApiExceptionHandlingMiddleware>();
        var middleware = new ApiExceptionHandlingMiddleware(
            _ => throw new InvalidOperationException("Test failure."),
            logger
        );
        var context = new DefaultHttpContext();
        context.Request.Method = "GET\r\nForged-Method";
        context.Request.Path = "/api/test\r\nForged-Path";
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.NotNull(logger.Message);
        Assert.DoesNotContain('\r', logger.Message);
        Assert.DoesNotContain('\n', logger.Message);
        Assert.Contains("GETForged-Method", logger.Message, StringComparison.Ordinal);
        Assert.Contains("/api/testForged-Path", logger.Message, StringComparison.Ordinal);
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public string? Message { get; private set; }

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull
        {
            return null;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            return true;
        }

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter
        )
        {
            Message = formatter(state, exception);
        }
    }
}
