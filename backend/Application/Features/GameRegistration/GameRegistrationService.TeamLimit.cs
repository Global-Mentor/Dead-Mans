using backend.Application.Configuration;
using backend.Application.Contracts;

namespace backend.Application.Features.GameRegistration;

public sealed partial class GameRegistrationService
{
    public Task<GameRegistrationResult<bool>> UpdateTeamLimitAsync(
        Guid gameId, int? teamLimit, CancellationToken cancellationToken = default)
    {
        if (teamLimit is < 1 or > GameRegistrationDefaults.MaxTeamLimit)
            return Task.FromResult(Fail<bool>(GameRegistrationErrorCode.InvalidTeamLimit));

        return CompleteMutationAsync(_persistence.PersistUpdateTeamLimitAsync(gameId, teamLimit, cancellationToken));
    }
}
