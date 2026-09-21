using System.Text.Json;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Realtime;
using backend.Application.Configuration;
using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Infrastructure.Twitch;

internal sealed class TwitchQuizIntegrationService : ITwitchQuizIntegrationService
{
    private readonly ApplicationDbContext _db;
    private readonly TwitchQuizOptions _options;
    private readonly TwitchQuizApiClient _api;
    private readonly IGameQuizService _quiz;
    private readonly IGameBoardEventsPublisher _events;
    private readonly IDataProtector _stateProtector;
    private readonly TwitchEventSubHealth _eventSubHealth;
    private readonly TimeProvider _clock;

    public TwitchQuizIntegrationService(
        ApplicationDbContext db,
        IOptions<TwitchQuizOptions> options,
        TwitchQuizApiClient api,
        IGameQuizService quiz,
        IGameBoardEventsPublisher events,
        IDataProtectionProvider dataProtectionProvider,
        TwitchEventSubHealth eventSubHealth,
        TimeProvider clock)
    {
        _db = db;
        _options = options.Value;
        _api = api;
        _quiz = quiz;
        _events = events;
        _stateProtector = dataProtectionProvider.CreateProtector("DeadMans.TwitchQuiz.OAuthState.v1");
        _eventSubHealth = eventSubHealth;
        _clock = clock;
    }

    public bool IsEnabled => _options.Enabled;
    internal bool IsEventSubConnected => _eventSubHealth.IsConnected;

    public async Task<TwitchQuizIntegrationStatus> GetStatusAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled) return new(false, false, false, false, false, null, null, null, null);
        var connections = await _db.TwitchQuizConnections.AsNoTracking().ToArrayAsync(cancellationToken);
        var bot = connections.SingleOrDefault(x => x.Role == "bot");
        var broadcaster = connections.SingleOrDefault(x => x.Role == "broadcaster");
        var publication = await _db.TwitchQuizPublications.AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc).FirstOrDefaultAsync(cancellationToken);
        return new(
            true,
            bot is { RevokedAtUtc: null } && bot.TwitchUserId == _options.ExpectedBotUserId
                && TwitchQuizOptions.BotScopes.All(bot.Scopes.Contains),
            broadcaster is { RevokedAtUtc: null } && broadcaster.TwitchUserId == _options.ExpectedBroadcasterUserId
                && TwitchQuizOptions.BroadcasterScopes.All(broadcaster.Scopes.Contains),
            _eventSubHealth.IsConnected,
            connections.Any(x => x.RevokedAtUtc != null),
            bot?.TwitchUserId,
            broadcaster?.TwitchUserId,
            connections.Select(x => x.LastError).FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)) ?? publication?.LastError,
            publication is null ? null : Map(publication)
        );
    }

    public async Task<PrepareTwitchQuizQuestionResult> PrepareQuestionAsync(Guid? questionId, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled) return new(PrepareTwitchQuizQuestionOutcome.Disabled);
        var status = await GetStatusAsync(cancellationToken);
        if (!status.BotConnected || !status.BroadcasterConnected || !status.EventSubConnected)
            return new(PrepareTwitchQuizQuestionOutcome.NotConnected);

        await using var transaction = _db.Database.IsRelational()
            ? await _db.Database.BeginTransactionAsync(cancellationToken) : null;
        var game = await _db.Games.SingleOrDefaultAsync(x => x.Status == GameStatusValue.Active && !x.IsDeleted, cancellationToken);
        if (game is null) return new(PrepareTwitchQuizQuestionOutcome.NoActiveGame);
        if (transaction is not null)
            await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM games WHERE id = {game.Id} FOR UPDATE", cancellationToken);

        if (await _db.GameQuizQuestionSessions.AsNoTracking().AnyAsync(
                x => x.GameId == game.Id && x.Status == GameQuizQuestionSessionStatusValue.Open,
                cancellationToken))
            return new(PrepareTwitchQuizQuestionOutcome.PublicationInProgress);

        var activePublication = await _db.TwitchQuizPublications.AsNoTracking().FirstOrDefaultAsync(x =>
            x.GameId == game.Id && new[] { "publishing", "failed", "uncertain", "cancel_pending", "open" }.Contains(x.Status), cancellationToken);
        if (activePublication is not null)
            return new(PrepareTwitchQuizQuestionOutcome.PublicationInProgress, Map(activePublication));
        var pendingOutcome = await _db.TwitchQuizPublications.AsNoTracking().FirstOrDefaultAsync(x =>
            x.GameId == game.Id && x.QuestionSessionId != null
            && x.OutcomeDeliveryStatus != TwitchQuizDeliveryStatuses.Sent
            && x.OutcomeDeliveryStatus != TwitchQuizDeliveryStatuses.Skipped, cancellationToken);
        if (pendingOutcome is not null)
            return new(PrepareTwitchQuizQuestionOutcome.PendingOutcome, Map(pendingOutcome));

        var candidates = await _db.GameEnabledQuestions.AsNoTracking()
            .Where(x => x.GameId == game.Id && x.QuestionDefinition.IsEnabled && !x.QuestionDefinition.IsDeleted
                && (!questionId.HasValue || x.QuestionId == questionId)
                && !_db.GameQuizQuestionSessions.Any(s => s.GameId == game.Id && s.QuestionId == x.QuestionId)
                && !_db.TwitchQuizPublications.Any(p => p.GameId == game.Id && p.QuestionId == x.QuestionId && p.Status != TwitchQuizPublicationStatuses.Cancelled))
            .ToArrayAsync(cancellationToken);
        if (candidates.Length == 0) return new(PrepareTwitchQuizQuestionOutcome.NoAvailableQuestions);
        var compatibleCandidates = candidates.Where(candidate => TwitchQuizMessageFormatter.FormatForValidation(
            candidate.QuestionTextSnapshot, candidate.OptionTextsSnapshot,
            game.QuizAnswerDurationSeconds, candidate.RewardSnapshot).IsCompatible).ToArray();
        if (compatibleCandidates.Length == 0)
            return questionId.HasValue
                ? new(PrepareTwitchQuizQuestionOutcome.IncompatibleQuestion, ErrorCode: "twitch_quiz.message_too_long")
                : new(PrepareTwitchQuizQuestionOutcome.NoAvailableQuestions);
        GameEnabledQuestion selected;
        if (questionId.HasValue)
        {
            selected = compatibleCandidates[0];
        }
        else
        {
            var candidateIds = compatibleCandidates.Select(x => x.QuestionId).ToArray();
            var usage = await _db.GameQuizQuestionSessions.AsNoTracking()
                .Where(x => candidateIds.Contains(x.QuestionId))
                .GroupBy(x => x.QuestionId)
                .Select(group => new { QuestionId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(x => x.QuestionId, x => x.Count, cancellationToken);
            var minimumUsage = compatibleCandidates.Min(x => usage.GetValueOrDefault(x.QuestionId));
            var maximumPriority = compatibleCandidates
                .Where(x => usage.GetValueOrDefault(x.QuestionId) == minimumUsage)
                .Max(x => x.PrioritySnapshot);
            var prioritized = compatibleCandidates.Where(x =>
                usage.GetValueOrDefault(x.QuestionId) == minimumUsage
                && x.PrioritySnapshot == maximumPriority).ToArray();
            selected = prioritized[Random.Shared.Next(prioritized.Length)];
        }
        var shuffled = selected.OptionIdsSnapshot.Zip(selected.OptionTextsSnapshot, (id, text) => (id, text)).ToArray();
        Random.Shared.Shuffle(shuffled);
        var askOrder = Math.Max(
            await _db.GameQuizQuestionSessions.Where(x => x.GameId == game.Id).MaxAsync(x => (int?)x.AskOrder, cancellationToken) ?? 0,
            await _db.TwitchQuizPublications.Where(x => x.GameId == game.Id).MaxAsync(x => (int?)x.AskOrder, cancellationToken) ?? 0) + 1;
        var validation = TwitchQuizMessageFormatter.FormatForValidation(
            selected.QuestionTextSnapshot, shuffled.Select(x => x.text).ToArray(), game.QuizAnswerDurationSeconds, selected.RewardSnapshot);
        if (!validation.IsCompatible)
            return new(PrepareTwitchQuizQuestionOutcome.IncompatibleQuestion, ErrorCode: validation.ErrorCode);
        var now = _clock.GetUtcNow().UtcDateTime;
        var publication = new TwitchQuizPublication
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            QuestionId = selected.QuestionId,
            AskOrder = askOrder,
            DurationSeconds = game.QuizAnswerDurationSeconds,
            QuestionRevisionSnapshot = selected.QuestionRevisionSnapshot,
            QuestionCodeSnapshot = selected.QuestionCodeSnapshot,
            CategoryNameSnapshot = selected.CategoryNameSnapshot,
            QuestionTextSnapshot = selected.QuestionTextSnapshot,
            OptionIdsSnapshot = shuffled.Select(x => x.id).ToArray(),
            OptionTextsSnapshot = shuffled.Select(x => x.text).ToArray(),
            CorrectOptionIdSnapshot = selected.CorrectOptionIdSnapshot,
            RewardSnapshot = selected.RewardSnapshot,
            QuestionMessage = TwitchQuizMessageFormatter.FormatQuestion(askOrder, selected.QuestionTextSnapshot),
            OptionsMessage = TwitchQuizMessageFormatter.FormatOptions(shuffled.Select(x => x.text).ToArray(), game.QuizAnswerDurationSeconds),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        _db.Add(publication);
        await _db.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        await PublishStateChangedAsync(cancellationToken);
        return new(PrepareTwitchQuizQuestionOutcome.Prepared, Map(publication));
    }

    public async Task<TwitchQuizPublicationState?> RetryPublicationAsync(Guid publicationId, CancellationToken cancellationToken = default)
    {
        await using var lease = await TwitchPublicationLease.AcquireAsync(_db, cancellationToken);
        var row = await _db.TwitchQuizPublications.SingleOrDefaultAsync(x => x.Id == publicationId, cancellationToken);
        if (row is null || row.Status is not (TwitchQuizPublicationStatuses.Failed or TwitchQuizPublicationStatuses.Uncertain)) return row is null ? null : Map(row);
        if (row.QuestionDeliveryStatus is TwitchQuizDeliveryStatuses.Failed or TwitchQuizDeliveryStatuses.Uncertain)
            row.QuestionDeliveryStatus = TwitchQuizDeliveryStatuses.Pending;
        else if (row.OptionsDeliveryStatus is TwitchQuizDeliveryStatuses.Failed or TwitchQuizDeliveryStatuses.Uncertain)
            row.OptionsDeliveryStatus = TwitchQuizDeliveryStatuses.Pending;
        var retryingOutcome = row.OutcomeDeliveryStatus is TwitchQuizDeliveryStatuses.Failed or TwitchQuizDeliveryStatuses.Uncertain;
        if (retryingOutcome)
            row.OutcomeDeliveryStatus = TwitchQuizDeliveryStatuses.Pending;
        var retryingCancellation = retryingOutcome
            && (!row.QuestionSessionId.HasValue
                || await _db.GameQuizQuestionSessions.AsNoTracking().AnyAsync(
                    x => x.Id == row.QuestionSessionId && x.Status == GameQuizQuestionSessionStatusValue.Skipped,
                    cancellationToken));
        row.Status = retryingCancellation
            ? TwitchQuizPublicationStatuses.CancelPending
            : row.QuestionSessionId.HasValue
                ? TwitchQuizPublicationStatuses.Open
                : TwitchQuizPublicationStatuses.Publishing;
        row.LastError = null;
        row.UpdatedAtUtc = _clock.GetUtcNow().UtcDateTime;
        await _db.SaveChangesAsync(cancellationToken);
        await PublishStateChangedAsync(cancellationToken);
        return Map(row);
    }

    public async Task<TwitchQuizPublicationState?> CancelPublicationAsync(Guid publicationId, CancellationToken cancellationToken = default)
    {
        await using var lease = await TwitchPublicationLease.AcquireAsync(_db, cancellationToken);
        var row = await _db.TwitchQuizPublications.SingleOrDefaultAsync(x => x.Id == publicationId, cancellationToken);
        if (row is null || row.Status is TwitchQuizPublicationStatuses.Completed or TwitchQuizPublicationStatuses.Cancelled) return row is null ? null : Map(row);
        await using var transaction = _db.Database.IsRelational() ? await _db.Database.BeginTransactionAsync(cancellationToken) : null;
        if (transaction is not null)
        {
            // Match the quiz settlement lock order so cancellation cannot overwrite settled rewards.
            await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM games WHERE id = {row.GameId} FOR UPDATE", cancellationToken);
            if (row.QuestionSessionId.HasValue)
                await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM game_quiz_question_sessions WHERE id = {row.QuestionSessionId.Value} FOR UPDATE", cancellationToken);
        }
        if (row.QuestionSessionId.HasValue)
        {
            var session = await _db.GameQuizQuestionSessions.SingleAsync(x => x.Id == row.QuestionSessionId, cancellationToken);
            if (transaction is not null) await _db.Entry(session).ReloadAsync(cancellationToken);
            if (session.Status != GameQuizQuestionSessionStatusValue.Open
                && session.Status != GameQuizQuestionSessionStatusValue.Skipped) return Map(row);
            if (session.Status == GameQuizQuestionSessionStatusValue.Open)
            {
                session.Status = GameQuizQuestionSessionStatusValue.Skipped;
                session.ClosedAtUtc = _clock.GetUtcNow().UtcDateTime;
            }
        }
        var wasPublished = row.QuestionDeliveryStatus is TwitchQuizDeliveryStatuses.Sent or TwitchQuizDeliveryStatuses.Uncertain
            || row.OptionsDeliveryStatus is TwitchQuizDeliveryStatuses.Sent or TwitchQuizDeliveryStatuses.Uncertain;
        row.Status = wasPublished ? TwitchQuizPublicationStatuses.CancelPending : TwitchQuizPublicationStatuses.Cancelled;
        row.OutcomeDeliveryStatus = wasPublished ? TwitchQuizDeliveryStatuses.Pending : TwitchQuizDeliveryStatuses.Skipped;
        row.UpdatedAtUtc = _clock.GetUtcNow().UtcDateTime;
        await _db.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        await PublishStateChangedAsync(cancellationToken);
        return Map(row);
    }

    public async Task<TwitchQuizPublicationState?> SkipOutcomeAsync(Guid publicationId, CancellationToken cancellationToken = default)
    {
        await using var lease = await TwitchPublicationLease.AcquireAsync(_db, cancellationToken);
        var row = await _db.TwitchQuizPublications.SingleOrDefaultAsync(x => x.Id == publicationId, cancellationToken);
        if (row is null) return null;
        if (row.OutcomeDeliveryStatus is not (TwitchQuizDeliveryStatuses.Failed or TwitchQuizDeliveryStatuses.Uncertain)) return Map(row);
        if (row.QuestionSessionId.HasValue && await _db.GameQuizQuestionSessions.AnyAsync(
            x => x.Id == row.QuestionSessionId && x.Status == GameQuizQuestionSessionStatusValue.Open, cancellationToken)) return Map(row);
        row.OutcomeDeliveryStatus = TwitchQuizDeliveryStatuses.Skipped;
        row.Status = row.QuestionSessionId.HasValue ? TwitchQuizPublicationStatuses.Completed : TwitchQuizPublicationStatuses.Cancelled;
        row.LastError = null;
        row.UpdatedAtUtc = _clock.GetUtcNow().UtcDateTime;
        await _db.SaveChangesAsync(cancellationToken);
        await PublishStateChangedAsync(cancellationToken);
        return Map(row);
    }

    public async Task HandleChatMessageAsync(TwitchEventSubMessage message, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || message.SubscriptionType != "channel.chat.message"
            || message.BroadcasterUserId != _options.ExpectedBroadcasterUserId
            || message.ChatterUserId == _options.ExpectedBotUserId
            || (!string.IsNullOrWhiteSpace(message.SourceBroadcasterUserId)
                && message.SourceBroadcasterUserId != _options.ExpectedBroadcasterUserId)
            || !TwitchQuizChatCommandParser.TryParseAnswer(message.MessageText, out var optionNumber)) return;
        if (await _db.TwitchEventSubReceipts.AsNoTracking().AnyAsync(x => x.NotificationId == message.NotificationId || x.ChatMessageId == message.MessageId, cancellationToken)) return;

        var now = _clock.GetUtcNow().UtcDateTime;
        var session = await _db.GameQuizQuestionSessions.AsNoTracking().SingleOrDefaultAsync(x =>
            x.Status == GameQuizQuestionSessionStatusValue.Open
            && x.SourceChannelId == _options.ExpectedBroadcasterUserId, cancellationToken);
        string outcome;
        if (session is null || now >= session.ClosesAtUtc || message.EventTimestampUtc < session.AskedAtUtc)
            outcome = "ignored_no_open_session";
        else if (optionNumber > session.OptionIdsSnapshot.Length)
            outcome = "ignored_option_not_found";
        else
        {
            var result = await _quiz.SubmitQuizAnswerAsync(session.Id, new SubmitGameQuizAnswerInput(
                session.OptionIdsSnapshot[optionNumber - 1], new TwitchGameQuizAnswerSource(
                    message.ChatterUserId, message.ChatterLogin, message.ChatterDisplayName,
                    message.BroadcasterUserId, message.MessageId)), cancellationToken);
            outcome = result.Outcome.ToString();
        }
        _db.TwitchEventSubReceipts.Add(new TwitchEventSubReceipt
        {
            NotificationId = message.NotificationId,
            ChatMessageId = message.MessageId,
            QuestionSessionId = session?.Id,
            Outcome = outcome,
            EventTimestampUtc = message.EventTimestampUtc,
            ProcessedAtUtc = now
        });
        try { await _db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException) { _db.ChangeTracker.Clear(); }
    }

    public async Task HandleRevocationAsync(string subscriptionType, string status, CancellationToken cancellationToken = default)
    {
        _eventSubHealth.SetConnected(false);
        var rows = await _db.TwitchQuizConnections.ToArrayAsync(cancellationToken);
        foreach (var row in rows) { row.LastError = $"EventSub {subscriptionType} revoked: {status}."; row.UpdatedAtUtc = _clock.GetUtcNow().UtcDateTime; }
        await _db.SaveChangesAsync(cancellationToken);
        await PublishStateChangedAsync(cancellationToken);
    }

    public string BuildAuthorizationUrl(string role, string state)
    {
        var scopes = role == "bot" ? TwitchQuizOptions.BotScopes : role == "broadcaster" ? TwitchQuizOptions.BroadcasterScopes : throw new ArgumentOutOfRangeException(nameof(role));
        return $"{_options.OAuthBaseUrl.TrimEnd('/')}/oauth2/authorize?client_id={Uri.EscapeDataString(_options.ClientId)}&redirect_uri={Uri.EscapeDataString(_options.OAuthCallbackUrl)}&response_type=code&scope={Uri.EscapeDataString(string.Join(' ', scopes))}&state={Uri.EscapeDataString(state)}&force_verify=true";
    }

    public string CreateAuthorizationState(string role, Guid adminUserId)
    {
        if (role is not ("bot" or "broadcaster")) throw new ArgumentOutOfRangeException(nameof(role));
        return _stateProtector.Protect(JsonSerializer.Serialize(new OAuthState(role, adminUserId, _clock.GetUtcNow().UtcDateTime.AddMinutes(10))));
    }

    public async Task CompleteAuthorizationAsync(string code, string state, Guid adminUserId, CancellationToken cancellationToken = default)
    {
        var payload = JsonSerializer.Deserialize<OAuthState>(_stateProtector.Unprotect(state))
            ?? throw new InvalidOperationException("OAuth state is invalid.");
        if (payload.AdminUserId != adminUserId || payload.ExpiresAtUtc < _clock.GetUtcNow().UtcDateTime)
            throw new InvalidOperationException("OAuth state has expired or belongs to another administrator.");
        var grant = await _api.ExchangeCodeAsync(code, cancellationToken);
        var expectedId = payload.Role == "bot" ? _options.ExpectedBotUserId : _options.ExpectedBroadcasterUserId;
        var requiredScopes = payload.Role == "bot" ? TwitchQuizOptions.BotScopes : TwitchQuizOptions.BroadcasterScopes;
        if (grant.Identity.Id != expectedId || requiredScopes.Except(grant.Scopes, StringComparer.Ordinal).Any())
            throw new InvalidOperationException("Twitch account or granted scopes do not match the configured integration.");
        await _api.SaveGrantAsync(payload.Role, grant, cancellationToken);
        await PublishStateChangedAsync(cancellationToken);
    }

    internal async Task ProcessNextAsync(CancellationToken cancellationToken)
    {
        if (!IsEnabled) return;
        await using var lease = await TwitchPublicationLease.AcquireAsync(_db, cancellationToken);
        var row = await _db.TwitchQuizPublications.OrderBy(x => x.CreatedAtUtc).FirstOrDefaultAsync(x =>
            x.Status == TwitchQuizPublicationStatuses.Publishing
            || x.Status == TwitchQuizPublicationStatuses.CancelPending
            || (x.QuestionSessionId != null && (x.OutcomeDeliveryStatus == TwitchQuizDeliveryStatuses.Pending
                || x.OutcomeDeliveryStatus == TwitchQuizDeliveryStatuses.Sending)), cancellationToken);
        if (row is null) return;
        if (row.QuestionDeliveryStatus == TwitchQuizDeliveryStatuses.Sending
            || row.OptionsDeliveryStatus == TwitchQuizDeliveryStatuses.Sending
            || row.OutcomeDeliveryStatus == TwitchQuizDeliveryStatuses.Sending)
        {
            if (row.QuestionDeliveryStatus == TwitchQuizDeliveryStatuses.Sending)
                row.QuestionDeliveryStatus = TwitchQuizDeliveryStatuses.Uncertain;
            if (row.OptionsDeliveryStatus == TwitchQuizDeliveryStatuses.Sending)
                row.OptionsDeliveryStatus = TwitchQuizDeliveryStatuses.Uncertain;
            if (row.OutcomeDeliveryStatus == TwitchQuizDeliveryStatuses.Sending)
                row.OutcomeDeliveryStatus = TwitchQuizDeliveryStatuses.Uncertain;
            row.Status = TwitchQuizPublicationStatuses.Uncertain;
            row.LastError = "The process stopped while Twitch delivery was in flight; delivery is unknown.";
            row.UpdatedAtUtc = _clock.GetUtcNow().UtcDateTime;
            await _db.SaveChangesAsync(cancellationToken);
            await PublishStateChangedAsync(cancellationToken);
            return;
        }
        var gameIsActive = await _db.Games.AsNoTracking().AnyAsync(
            x => x.Id == row.GameId && x.Status == GameStatusValue.Active && !x.IsDeleted,
            cancellationToken);
        if (!gameIsActive && !row.QuestionSessionId.HasValue
            && row.Status is not (TwitchQuizPublicationStatuses.CancelPending or TwitchQuizPublicationStatuses.Cancelled))
        {
            var wasPublished = row.QuestionDeliveryStatus == TwitchQuizDeliveryStatuses.Sent
                || row.OptionsDeliveryStatus == TwitchQuizDeliveryStatuses.Sent;
            row.Status = wasPublished ? TwitchQuizPublicationStatuses.CancelPending : TwitchQuizPublicationStatuses.Cancelled;
            row.OutcomeDeliveryStatus = wasPublished ? TwitchQuizDeliveryStatuses.Pending : TwitchQuizDeliveryStatuses.Skipped;
            row.UpdatedAtUtc = _clock.GetUtcNow().UtcDateTime;
            await _db.SaveChangesAsync(cancellationToken);
            await PublishStateChangedAsync(cancellationToken);
            if (!wasPublished) return;
        }
        if (row.Status == TwitchQuizPublicationStatuses.CancelPending)
        {
            await SendAndApplyAsync(row, TwitchQuizMessageFormatter.FormatCancellation(row.AskOrder), "outcome", cancellationToken);
            if (row.OutcomeDeliveryStatus == TwitchQuizDeliveryStatuses.Sent) row.Status = TwitchQuizPublicationStatuses.Cancelled;
            await _db.SaveChangesAsync(cancellationToken); await PublishStateChangedAsync(cancellationToken); return;
        }
        if (row.QuestionDeliveryStatus == TwitchQuizDeliveryStatuses.Pending)
        {
            await SendAndApplyAsync(row, row.QuestionMessage, "question", cancellationToken);
            await _db.SaveChangesAsync(cancellationToken); await PublishStateChangedAsync(cancellationToken); return;
        }
        if (row.OptionsDeliveryStatus == TwitchQuizDeliveryStatuses.Pending)
        {
            await SendAndApplyAsync(row, row.OptionsMessage, "options", cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
            await PublishStateChangedAsync(cancellationToken);
            if (row.OptionsDeliveryStatus != TwitchQuizDeliveryStatuses.Sent) return;
        }
        if (!row.QuestionSessionId.HasValue && row.QuestionDeliveryStatus == TwitchQuizDeliveryStatuses.Sent && row.OptionsDeliveryStatus == TwitchQuizDeliveryStatuses.Sent)
        {
            await OpenSessionAsync(row, cancellationToken); return;
        }
        if (row.QuestionSessionId.HasValue && row.OutcomeDeliveryStatus == TwitchQuizDeliveryStatuses.Pending)
        {
            var session = await _db.GameQuizQuestionSessions.AsNoTracking().SingleAsync(x => x.Id == row.QuestionSessionId, cancellationToken);
            if (session.Status == GameQuizQuestionSessionStatusValue.Open) return;
            if (session.Status == GameQuizQuestionSessionStatusValue.Skipped)
            {
                row.Status = TwitchQuizPublicationStatuses.CancelPending;
                await _db.SaveChangesAsync(cancellationToken);
                await PublishStateChangedAsync(cancellationToken);
                return;
            }
            var total = await _db.GameQuizSubmissions.CountAsync(x => x.QuestionSessionId == session.Id, cancellationToken);
            var correct = await _db.GameQuizSubmissions.CountAsync(x => x.QuestionSessionId == session.Id && x.IsCorrect, cancellationToken);
            var correctIndex = Array.IndexOf(session.OptionIdsSnapshot, session.CorrectOptionIdSnapshot);
            var message = TwitchQuizMessageFormatter.FormatResult(correctIndex + 1, session.OptionTextsSnapshot[correctIndex], correct, total, session.RewardSnapshot);
            await SendAndApplyAsync(row, message, "outcome", cancellationToken);
            if (row.OutcomeDeliveryStatus == TwitchQuizDeliveryStatuses.Sent) row.Status = TwitchQuizPublicationStatuses.Completed;
            await _db.SaveChangesAsync(cancellationToken);
            await PublishStateChangedAsync(cancellationToken);
        }
    }

    internal async Task<bool> EnsureSubscriptionAsync(CancellationToken cancellationToken)
    {
        try
        {
            var connected = await _api.EnsureEventSubSubscriptionAsync(cancellationToken);
            _eventSubHealth.SetConnected(connected);
            return connected;
        }
        catch
        {
            _eventSubHealth.SetConnected(false);
            throw;
        }
    }

    internal Task CleanupReceiptsAsync(CancellationToken cancellationToken) =>
        _db.TwitchEventSubReceipts
            .Where(x => x.ProcessedAtUtc < _clock.GetUtcNow().UtcDateTime.AddDays(-7))
            .ExecuteDeleteAsync(cancellationToken);

    private async Task OpenSessionAsync(TwitchQuizPublication row, CancellationToken cancellationToken)
    {
        await using var transaction = _db.Database.IsRelational() ? await _db.Database.BeginTransactionAsync(cancellationToken) : null;
        if (transaction is not null) await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM games WHERE id = {row.GameId} FOR UPDATE", cancellationToken);
        if (!await _db.Games.AnyAsync(x => x.Id == row.GameId && x.Status == GameStatusValue.Active && !x.IsDeleted, cancellationToken))
        {
            row.Status = TwitchQuizPublicationStatuses.CancelPending;
            row.OutcomeDeliveryStatus = TwitchQuizDeliveryStatuses.Pending;
            await _db.SaveChangesAsync(cancellationToken);
            if (transaction is not null) await transaction.CommitAsync(cancellationToken);
            await PublishStateChangedAsync(cancellationToken);
            return;
        }
        if (await _db.GameQuizQuestionSessions.AnyAsync(x => x.GameId == row.GameId && x.Status == GameQuizQuestionSessionStatusValue.Open, cancellationToken))
        {
            row.Status = TwitchQuizPublicationStatuses.Failed;
            row.LastError = "Another question session is already open.";
            await _db.SaveChangesAsync(cancellationToken);
            if (transaction is not null) await transaction.CommitAsync(cancellationToken);
            await PublishStateChangedAsync(cancellationToken);
            return;
        }
        var now = _clock.GetUtcNow().UtcDateTime;
        var session = new GameQuizQuestionSession
        {
            Id = Guid.NewGuid(),
            GameId = row.GameId,
            QuestionId = row.QuestionId,
            AskOrder = row.AskOrder,
            AskedAtUtc = now,
            ClosesAtUtc = now.AddSeconds(row.DurationSeconds),
            Status = GameQuizQuestionSessionStatusValue.Open,
            QuestionRevisionSnapshot = row.QuestionRevisionSnapshot,
            QuestionCodeSnapshot = row.QuestionCodeSnapshot,
            CategoryNameSnapshot = row.CategoryNameSnapshot,
            QuestionTextSnapshot = row.QuestionTextSnapshot,
            OptionIdsSnapshot = row.OptionIdsSnapshot,
            OptionTextsSnapshot = row.OptionTextsSnapshot,
            CorrectOptionIdSnapshot = row.CorrectOptionIdSnapshot,
            RewardSnapshot = row.RewardSnapshot,
            DeliveryKind = GameQuizDeliveryKindValue.Twitch,
            SourceChannelId = _options.ExpectedBroadcasterUserId,
            SourceMessageId = row.OptionsMessageId
        };
        _db.Add(session); row.QuestionSessionId = session.Id; row.Status = TwitchQuizPublicationStatuses.Open; row.UpdatedAtUtc = now;
        await _db.SaveChangesAsync(cancellationToken); if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        await _events.PublishQuizStateChangedAsync(new GameQuizStateChangedEvent(row.GameId, GameQuizStateChangeKinds.QuestionAsked, now), cancellationToken);
        await PublishStateChangedAsync(cancellationToken);
    }

    private async Task SendAndApplyAsync(TwitchQuizPublication row, string message, string step, CancellationToken cancellationToken)
    {
        if (step == "question") row.QuestionDeliveryStatus = TwitchQuizDeliveryStatuses.Sending;
        else if (step == "options") row.OptionsDeliveryStatus = TwitchQuizDeliveryStatuses.Sending;
        else row.OutcomeDeliveryStatus = TwitchQuizDeliveryStatuses.Sending;
        row.UpdatedAtUtc = _clock.GetUtcNow().UtcDateTime;
        await _db.SaveChangesAsync(cancellationToken);
        var result = await _api.SendChatMessageAsync(message, cancellationToken);
        var delivery = result.Outcome switch
        {
            TwitchChatSendOutcome.Sent => TwitchQuizDeliveryStatuses.Sent,
            TwitchChatSendOutcome.Uncertain => TwitchQuizDeliveryStatuses.Uncertain,
            _ => TwitchQuizDeliveryStatuses.Failed
        };
        if (step == "question") { row.QuestionDeliveryStatus = delivery; row.QuestionMessageId = result.MessageId; }
        else if (step == "options") { row.OptionsDeliveryStatus = delivery; row.OptionsMessageId = result.MessageId; }
        else { row.OutcomeDeliveryStatus = delivery; row.OutcomeMessageId = result.MessageId; }
        if (result.Outcome != TwitchChatSendOutcome.Sent)
            row.Status = result.Outcome == TwitchChatSendOutcome.Uncertain ? TwitchQuizPublicationStatuses.Uncertain : TwitchQuizPublicationStatuses.Failed;
        row.LastError = result.Error; row.UpdatedAtUtc = _clock.GetUtcNow().UtcDateTime;
    }

    private static TwitchQuizPublicationState Map(TwitchQuizPublication row) => new(
        row.Id, row.GameId, row.QuestionId, row.QuestionSessionId, row.AskOrder, row.Status,
        row.QuestionDeliveryStatus, row.OptionsDeliveryStatus, row.OutcomeDeliveryStatus,
        row.QuestionMessage, row.OptionsMessage, row.LastError, row.CreatedAtUtc, row.UpdatedAtUtc);
    private async Task PublishStateChangedAsync(CancellationToken cancellationToken)
    {
        try { await _events.PublishTwitchQuizStateChangedAsync(cancellationToken); }
        catch { /* Persistence is authoritative; polling/reconnect will resync the panel. */ }
    }
    private sealed record OAuthState(string Role, Guid AdminUserId, DateTime ExpiresAtUtc);
}

internal sealed class TwitchEventSubHealth
{
    private int _isConnected;
    public bool IsConnected => Volatile.Read(ref _isConnected) == 1;
    public void SetConnected(bool value) => Volatile.Write(ref _isConnected, value ? 1 : 0);
}
