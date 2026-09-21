using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public interface ITwitchQuizIntegrationService
{
    bool IsEnabled { get; }
    Task<TwitchQuizIntegrationStatus> GetStatusAsync(CancellationToken cancellationToken = default);
    Task<PrepareTwitchQuizQuestionResult> PrepareQuestionAsync(Guid? questionId, CancellationToken cancellationToken = default);
    Task<TwitchQuizPublicationState?> RetryPublicationAsync(Guid publicationId, CancellationToken cancellationToken = default);
    Task<TwitchQuizPublicationState?> CancelPublicationAsync(Guid publicationId, CancellationToken cancellationToken = default);
    Task<TwitchQuizPublicationState?> SkipOutcomeAsync(Guid publicationId, CancellationToken cancellationToken = default);
    Task HandleChatMessageAsync(TwitchEventSubMessage message, CancellationToken cancellationToken = default);
    Task HandleRevocationAsync(string subscriptionType, string status, CancellationToken cancellationToken = default);
    string BuildAuthorizationUrl(string role, string state);
    string CreateAuthorizationState(string role, Guid adminUserId);
    Task CompleteAuthorizationAsync(string code, string state, Guid adminUserId, CancellationToken cancellationToken = default);
}
