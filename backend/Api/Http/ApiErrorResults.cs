using backend.Api.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace backend.Api.Http;

public readonly record struct ApiErrorDescriptor(int StatusCode, string Error, string? Code = null);

public static class ApiErrorResults
{
    public static ErrorResponse ToErrorResponse(this ApiErrorDescriptor error, string? requestId = null) =>
        ErrorResponseFactory.Create(error.Error, error.Code, requestId);

    public static ObjectResult WithStatus(
        int statusCode,
        string error,
        string? code = null,
        string? requestId = null
    )
    {
        ApiErrorMetrics.Record(statusCode, code, "mapping");
        return new(ErrorResponseFactory.Create(error, code, requestId))
        {
            StatusCode = statusCode
        };
    }

    public static IActionResult BadRequestError(
        this ControllerBase controller,
        string error,
        string? code = null
    )
    {
        ApiErrorMetrics.Record(StatusCodes.Status400BadRequest, code, "controller");
        return controller.BadRequest(
            ErrorResponseFactory.Create(error, code, controller.HttpContext.TraceIdentifier)
        );
    }

    public static IActionResult UnauthorizedError(
        this ControllerBase controller,
        string error,
        string? code = null
    )
    {
        ApiErrorMetrics.Record(StatusCodes.Status401Unauthorized, code, "controller");
        return controller.Unauthorized(
            ErrorResponseFactory.Create(error, code, controller.HttpContext.TraceIdentifier)
        );
    }

    public static IActionResult NotFoundError(
        this ControllerBase controller,
        string error,
        string? code = null
    )
    {
        ApiErrorMetrics.Record(StatusCodes.Status404NotFound, code, "controller");
        return controller.NotFound(
            ErrorResponseFactory.Create(error, code, controller.HttpContext.TraceIdentifier)
        );
    }

    public static IActionResult ConflictError(
        this ControllerBase controller,
        string error,
        string? code = null
    )
    {
        ApiErrorMetrics.Record(StatusCodes.Status409Conflict, code, "controller");
        return controller.Conflict(
            ErrorResponseFactory.Create(error, code, controller.HttpContext.TraceIdentifier)
        );
    }

    public static IActionResult StatusError(
        this ControllerBase controller,
        int statusCode,
        string error,
        string? code = null
    )
    {
        ApiErrorMetrics.Record(statusCode, code, "controller");
        return controller.StatusCode(
            statusCode,
            ErrorResponseFactory.Create(error, code, controller.HttpContext.TraceIdentifier)
        );
    }

    public static ObjectResult WithStatus(ApiErrorDescriptor error) =>
        WithStatus(error.StatusCode, error.Error, error.Code);

    public static IActionResult Error(
        this ControllerBase controller,
        ApiErrorDescriptor error
    ) => controller.StatusError(error.StatusCode, error.Error, error.Code);
}
