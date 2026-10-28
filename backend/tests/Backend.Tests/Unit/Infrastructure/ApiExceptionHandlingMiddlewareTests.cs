using backend.Api.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Logging;

namespace Backend.Tests.Unit.Infrastructure;

public sealed class ApiExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_ClientCancellationRecords499WithoutAnErrorBodyOrException()
    {
        using var cancellation = new CancellationTokenSource();
        var logger = new CapturingLogger<ApiExceptionHandlingMiddleware>();
        var middleware = new ApiExceptionHandlingMiddleware(
            _ => throw new OperationCanceledException(cancellation.Token), logger);
        var context = new DefaultHttpContext { RequestAborted = cancellation.Token };
        context.Response.Body = new MemoryStream();
        await cancellation.CancelAsync();

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status499ClientClosedRequest, context.Response.StatusCode);
        Assert.Equal(0, context.Response.Body.Length);
        Assert.Null(logger.Message);
    }

    [Fact]
    public async Task InvokeAsync_ClientCancellationPreservesAnAlreadyStartedResponse()
    {
        using var cancellation = new CancellationTokenSource();
        var logger = new CapturingLogger<ApiExceptionHandlingMiddleware>();
        var middleware = new ApiExceptionHandlingMiddleware(
            _ => throw new OperationCanceledException(cancellation.Token), logger);
        var context = new DefaultHttpContext { RequestAborted = cancellation.Token };
        context.Features.Set<IHttpResponseFeature>(new StartedResponseFeature
        {
            StatusCode = StatusCodes.Status101SwitchingProtocols
        });
        context.Response.Body = new MemoryStream();
        await cancellation.CancelAsync();

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status101SwitchingProtocols, context.Response.StatusCode);
        Assert.Equal(0, context.Response.Body.Length);
        Assert.Null(logger.Message);
    }

    [Fact]
    public async Task InvokeAsync_CancellationWithoutClientAbortRemainsAServerError()
    {
        var logger = new CapturingLogger<ApiExceptionHandlingMiddleware>();
        var middleware = new ApiExceptionHandlingMiddleware(
            _ => throw new OperationCanceledException("Internal operation timed out."), logger);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        Assert.True(context.Response.Body.Length > 0);
        Assert.NotNull(logger.Message);
    }

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

    private sealed class StartedResponseFeature : HttpResponseFeature
    {
        public override bool HasStarted => true;
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
