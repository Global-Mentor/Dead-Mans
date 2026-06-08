using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public interface IGameHistoryService
{
    Task<IReadOnlyList<UserGameHistoryItem>> GetUserGameHistoryAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    );
}
