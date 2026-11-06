using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public interface IUserProfileReader
{
    Task<UserProfile?> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<UserProfileGamesPage?> GetGamesAsync(Guid userId, UserProfileParticipation participation, int page, int pageSize,
        CancellationToken cancellationToken = default);
    Task<UserProfileAnswersPage?> GetAnswersAsync(Guid userId, Guid? gameId, int page, int pageSize,
        CancellationToken cancellationToken = default);
}
