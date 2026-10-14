using backend.Application.Contracts;
using backend.Domain.Persistence;

namespace backend.Application.Features.GameRegistration;

public sealed partial class GameRegistrationService
{
    public async Task<GameRegistrationResult<RegistrationTeamDto>> ConfirmTeamAsync(
        Guid adminUserId,
        Guid teamId,
        CancellationToken cancellationToken = default
    )
    {
        var game = await _reads.GetManageableGameAsync(cancellationToken);
        if (game is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);
        }

        var team = await _reads.GetTeamAdminActionSnapshotAsync(game.GameId, teamId, cancellationToken);
        if (team is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotFound);
        }

        if (team.Status != TeamStatusValue.Forming)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotJoinable);
        }

        if (TeamNameValue.Normalize(team.Name) is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNameRequired);
        }

        if (team.MemberCount < game.MinPlayersPerTeam || team.MemberCount > game.MaxPlayersPerTeam)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotJoinable);
        }

        if (await _reads.TeamHasPendingInvitationAsync(game.GameId, teamId, cancellationToken))
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.PendingOutgoingInvitation);
        }

        return await CompleteMutationAsync(_persistence.PersistConfirmTeamAsync(
            game.GameId,
            adminUserId,
            teamId,
            game.MinPlayersPerTeam,
            game.MaxPlayersPerTeam,
            cancellationToken
        ));
    }

    public async Task<GameRegistrationResult<RegistrationTeamDto>> UnconfirmTeamAsync(
        Guid adminUserId, Guid teamId, CancellationToken cancellationToken = default)
    {
        var game = await _reads.GetManageableGameAsync(cancellationToken);
        if (game is null)
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);

        var team = await _reads.GetTeamAdminLifecycleSnapshotAsync(game.GameId, teamId, cancellationToken);
        if (team is null)
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotFound);
        if (team.IsActiveInGame)
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamActiveInGame);
        if (team.IsPlayed)
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamAlreadyPlayed);
        if (team.Status != TeamStatusValue.Confirmed)
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotJoinable);

        return await CompleteMutationAsync(_persistence.PersistUnconfirmTeamAsync(
            game.GameId, adminUserId, teamId, cancellationToken));
    }
}
