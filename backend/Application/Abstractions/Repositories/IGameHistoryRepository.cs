using backend.Application.Contracts;

namespace backend.Application.Abstractions.Repositories;

public interface IGameHistoryRepository
{
    Task<IReadOnlyList<UserGameHistoryItem>> GetUserGameHistoryAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    );
}
