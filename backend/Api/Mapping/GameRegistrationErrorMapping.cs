using backend.Api.Contracts;
using backend.Api.Errors;
using backend.Api.Http;
using backend.Application.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace backend.Api.Mapping;

public static class GameRegistrationErrorMapping
{
    public static ErrorResponse ToErrorResponse(GameRegistrationErrorCode error) =>
        ToDescriptor(error).ToErrorResponse();

    public static ErrorResponse NotOpenResponse() =>
        ToDescriptor(GameRegistrationErrorCode.GameNotInReady).ToErrorResponse();

    public static IActionResult ToActionResult(ControllerBase controller, GameRegistrationErrorCode error) =>
        controller.Error(ToDescriptor(error));

    public static ApiErrorDescriptor ToDescriptor(GameRegistrationErrorCode error) =>
        DomainErrorHttpPolicy.FromRegistration(error);
}
