using backend.Api.Contracts;
using backend.Application.Contracts;
using backend.Messaging;
using Microsoft.AspNetCore.Mvc;

namespace backend.Api.Mapping;

public static class GameRegistrationErrorMapping
{
    public static ErrorResponse ToErrorResponse(GameRegistrationErrorCode error) =>
        new(MapClientMessage(error), MapErrorCode(error));

    public static ErrorResponse NotOpenResponse() =>
        new(AppMessages.Client.GameRegistrationNotOpen, AppMessages.ErrorCodes.GameRegistrationNotOpen);

    public static IActionResult ToActionResult(GameRegistrationErrorCode error) =>
        error switch
        {
            GameRegistrationErrorCode.GameNotInReady =>
                new NotFoundObjectResult(ToErrorResponse(error)),
            GameRegistrationErrorCode.NoAvailableSlot
                or GameRegistrationErrorCode.UserAlreadyOnTeam
                or GameRegistrationErrorCode.TeamNotJoinable
                or GameRegistrationErrorCode.TeamFull
                or GameRegistrationErrorCode.SlotNotAvailable
                or GameRegistrationErrorCode.PendingInvitationExists =>
                new ConflictObjectResult(ToErrorResponse(error)),
            GameRegistrationErrorCode.TeamNotFound
                or GameRegistrationErrorCode.NotTeamMember
                or GameRegistrationErrorCode.InvitationNotFound
                or GameRegistrationErrorCode.InvitationNotPending
                or GameRegistrationErrorCode.UserNotFound
                or GameRegistrationErrorCode.SlotNotFound =>
                new NotFoundObjectResult(ToErrorResponse(error)),
            GameRegistrationErrorCode.OperationFailed =>
                new ObjectResult(ToErrorResponse(error))
                {
                    StatusCode = StatusCodes.Status500InternalServerError
                },
            _ => new ObjectResult(
                new ErrorResponse(AppMessages.Client.UnableToLoadCurrentGame)
            )
            {
                StatusCode = StatusCodes.Status500InternalServerError
            }
        };

    private static string MapClientMessage(GameRegistrationErrorCode error) =>
        error switch
        {
            GameRegistrationErrorCode.GameNotInReady => AppMessages.Client.GameRegistrationNotOpen,
            GameRegistrationErrorCode.NoAvailableSlot => AppMessages.Client.GameRegistrationNoSlots,
            GameRegistrationErrorCode.UserAlreadyOnTeam => AppMessages.Client.GameRegistrationAlreadyOnTeam,
            GameRegistrationErrorCode.TeamNotFound => AppMessages.Client.GameRegistrationTeamNotFound,
            GameRegistrationErrorCode.TeamNotJoinable
                or GameRegistrationErrorCode.TeamFull => AppMessages.Client.GameRegistrationTeamNotJoinable,
            GameRegistrationErrorCode.NotTeamMember => AppMessages.Client.GameRegistrationNotTeamMember,
            GameRegistrationErrorCode.InvitationNotFound
                or GameRegistrationErrorCode.InvitationNotPending =>
                AppMessages.Client.GameRegistrationInvitationInvalid,
            GameRegistrationErrorCode.UserNotFound => AppMessages.Client.UserMissingOrInactive,
            GameRegistrationErrorCode.SlotNotFound => AppMessages.Client.GameRegistrationSlotNotFound,
            GameRegistrationErrorCode.SlotNotAvailable => AppMessages.Client.GameRegistrationSlotNotAvailable,
            GameRegistrationErrorCode.PendingInvitationExists =>
                AppMessages.Client.GameRegistrationPendingInvitationExists,
            GameRegistrationErrorCode.OperationFailed =>
                AppMessages.Client.GameRegistrationOperationFailed,
            _ => AppMessages.Client.UnableToLoadCurrentGame
        };

    private static string MapErrorCode(GameRegistrationErrorCode error) =>
        error switch
        {
            GameRegistrationErrorCode.GameNotInReady => AppMessages.ErrorCodes.GameRegistrationNotOpen,
            GameRegistrationErrorCode.NoAvailableSlot => AppMessages.ErrorCodes.GameRegistrationNoSlots,
            GameRegistrationErrorCode.UserAlreadyOnTeam => AppMessages.ErrorCodes.GameRegistrationAlreadyOnTeam,
            GameRegistrationErrorCode.TeamNotFound => AppMessages.ErrorCodes.GameRegistrationTeamNotFound,
            GameRegistrationErrorCode.TeamNotJoinable
                or GameRegistrationErrorCode.TeamFull => AppMessages.ErrorCodes.GameRegistrationTeamNotJoinable,
            GameRegistrationErrorCode.NotTeamMember => AppMessages.ErrorCodes.GameRegistrationNotTeamMember,
            GameRegistrationErrorCode.InvitationNotFound
                or GameRegistrationErrorCode.InvitationNotPending =>
                AppMessages.ErrorCodes.GameRegistrationInvitationInvalid,
            GameRegistrationErrorCode.SlotNotFound => AppMessages.ErrorCodes.GameRegistrationSlotNotFound,
            GameRegistrationErrorCode.SlotNotAvailable => AppMessages.ErrorCodes.GameRegistrationSlotNotAvailable,
            GameRegistrationErrorCode.PendingInvitationExists =>
                AppMessages.ErrorCodes.GameRegistrationPendingInvitation,
            GameRegistrationErrorCode.OperationFailed =>
                AppMessages.ErrorCodes.GameRegistrationOperationFailed,
            _ => AppMessages.ErrorCodes.GameRegistrationOperationFailed
        };
}
