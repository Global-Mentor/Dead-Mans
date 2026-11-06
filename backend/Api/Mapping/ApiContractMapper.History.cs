using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Application.Contracts;
using backend.Domain.GameModifiers;

namespace backend.Api.Mapping;

public static partial class ApiContractMapper
{
    public static UserGameHistoryItemDto ToDto(this UserGameHistoryItem item, string mediaBaseUrl)
    {
        return new UserGameHistoryItemDto(
            item.GameId.ToString(),
            item.GameTitle,
            item.GameStatus,
            item.CreatedAtUtc,
            item.StartedAtUtc,
            item.FinishedAtUtc,
            item.ModifierActivations.Select(ToDto).ToArray(),
            item.QuestionAnswers.Select(answer => answer.ToDto(mediaBaseUrl)).ToArray(),
            item.ManualQuizAwards.Select(ToDto).ToArray()
        );
    }

    public static UserGameModifierActivationHistoryItemDto ToDto(
        this UserGameModifierActivationHistoryItem item
    )
    {
        return new UserGameModifierActivationHistoryItemDto(item.ModifierId.ToString(), item.ActivatedAtUtc);
    }

    public static UserGameQuestionAnswerHistoryItemDto ToDto(
        this UserGameQuestionAnswerHistoryItem item, string mediaBaseUrl
    )
    {
        return new UserGameQuestionAnswerHistoryItemDto(
            item.QuestionSessionId.ToString(),
            item.QuestionId.ToString(),
            item.QuestionText,
            item.CategoryName,
            item.AnsweredAtUtc,
            item.IsCorrect,
            item.AwardedPoints,
            item.SubmittedAnswer,
            item.AnsweredByUserId?.ToString()
        )
        { Image = item.Image?.ToDto(mediaBaseUrl) };
    }

    public static UserGameQuizManualAwardHistoryItemDto ToDto(
        this UserGameQuizManualAwardHistoryItem item
    )
    {
        return new UserGameQuizManualAwardHistoryItemDto(
            item.AwardId.ToString(),
            item.AwardedAtUtc,
            item.AwardedPoints,
            item.AwardedByUserId.ToString(),
            item.AwardedByDisplayName,
            item.OperationType,
            item.Reason
        );
    }

    public static GameHistoryLeaderboardEntryDto ToDto(this GameHistoryLeaderboardEntry item)
    {
        return new GameHistoryLeaderboardEntryDto(
            item.UserId.ToString(),
            item.DisplayName,
            item.MainGamePoints,
            item.QuizPoints,
            item.TotalPoints,
            item.GamesPlayed,
            item.MainGameRoundsPlayed,
            item.QuizQuestionsAnswered,
            item.CorrectQuizAnswers,
            item.ModifiersActivated,
            item.LastActivityAtUtc
        );
    }

    public static GameHistoryGameSummaryDto ToDto(this GameHistoryGameSummary item)
    {
        return new GameHistoryGameSummaryDto(
            item.GameId.ToString(),
            item.GameTitle,
            item.GameStatus,
            item.CreatedAtUtc,
            item.StartedAtUtc,
            item.FinishedAtUtc,
            item.MainGameRoundCount,
            item.QuizQuestionCount,
            item.UniquePlayerCount
        );
    }

    public static GameHistoryGameDetailsDto ToDto(this GameHistoryGameDetails item, string mediaBaseUrl)
    {
        return new GameHistoryGameDetailsDto(
            item.GameId.ToString(),
            item.GameTitle,
            item.GameStatus,
            item.CreatedAtUtc,
            item.StartedAtUtc,
            item.FinishedAtUtc,
            item.MainGame.ToDto(),
            item.Quiz.ToDto(mediaBaseUrl),
            item.FinalResult?.ToDto(),
            item.ModifierSnapshotStatus,
            item.ModifierSnapshots.Select(ToDto).ToArray(),
            item.Board?.ToDto()
        );
    }

    public static GameHistoryMainGameSectionDto ToDto(this GameHistoryMainGameSection item)
    {
        return new GameHistoryMainGameSectionDto(
            item.PlayerStats.Select(ToDto).ToArray(),
            item.TeamStats.Select(ToDto).ToArray(),
            item.ModifierActivations.Select(ToDto).ToArray(),
            item.Rounds.Select(ToDto).ToArray()
        )
        {
            TeamMembers = item.TeamMembers.Select(member => new GameHistoryTeamMemberDto(
                member.TeamId.ToString(), member.UserId.ToString())).ToArray()
        };
    }

    public static GameHistoryQuizSectionDto ToDto(this GameHistoryQuizSection item, string mediaBaseUrl)
    {
        return new GameHistoryQuizSectionDto(
            item.TotalPoints,
            item.PlayerStats.Select(ToDto).ToArray(),
            item.QuestionSessions.Select(session => session.ToDto(mediaBaseUrl)).ToArray(),
            item.ManualAwards.Select(ToDto).ToArray()
        );
    }

    public static GameHistoryPlayerSummaryDto ToDto(this GameHistoryPlayerSummary item)
    {
        return new GameHistoryPlayerSummaryDto(
            item.UserId.ToString(),
            item.DisplayName,
            item.Points,
            item.EventCount,
            item.LastActivityAtUtc
        );
    }

    public static GameHistoryQuizPlayerSummaryDto ToDto(this GameHistoryQuizPlayerSummary item)
    {
        return new GameHistoryQuizPlayerSummaryDto(
            item.UserId.ToString(),
            item.DisplayName,
            item.Points,
            item.SpentPoints,
            item.AvailablePoints,
            item.Attempts,
            item.CorrectAnswers,
            item.LastActivityAtUtc
        )
        {
            TextStatistics = item.TextStatistics is { } text ? new(text.Attempts, text.CorrectAnswers, text.Points) : null,
            ScreenshotStatistics = item.ScreenshotStatistics is { } image ? new(image.Attempts, image.CorrectAnswers, image.Points) : null
        };
    }

    public static GameHistoryModifierActivationItemDto ToDto(
        this GameHistoryModifierActivationItem item
    )
    {
        return new GameHistoryModifierActivationItemDto(
            item.ActivationId.ToString(),
            item.ModifierId.ToString(),
            item.ModifierName,
            item.ActivatedByUserId.ToString(),
            item.ActivatedByDisplayName,
            item.ActivatedAtUtc,
            item.Status,
            item.CancelledAtUtc,
            item.RefundAmount
        );
    }

    public static GameHistoryModifierSnapshotDto ToDto(this GameHistoryModifierSnapshot item) => new(
        item.ModifierId.ToString(), item.VersionId.ToString(), item.Revision, item.Name,
        item.Description, item.Category, item.IconEmoji, item.ActivationCommand,
        item.ActivationCost, item.ActivationLimit.ToDto(), item.BehaviorV2.ToDto(), item.Conflicts.Select(x => new ModifierConflictSnapshotDto(
            x.ModifierId.ToString(), x.Name)).ToArray(), item.SuccessfulActivationsCount,
        item.CancelledActivationsCount, item.ResultsCount, item.IsEmergencyDisabled,
        item.EmergencyDisabledAtUtc);

    public static GameHistoryRoundItemDto ToDto(this GameHistoryRoundItem item)
    {
        return new GameHistoryRoundItemDto(
            item.RoundId.ToString(),
            item.TeamId.ToString(),
            item.TeamName,
            item.TeamSlotIndex,
            item.Status,
            item.RoundVersion,
            item.StartedAtUtc,
            item.PreparedAtUtc,
            item.GameplayStartedAtUtc,
            item.ReviewedAtUtc,
            item.FinishedAtUtc,
            item.BaseScore,
            item.FinalScore,
            item.EmptyCardPenaltyApplied,
            item.ScoreDetails.ToDto(),
            item.KillsCount,
            item.BountyCount,
            item.CellId.ToString(),
            item.CellRowIndex,
            item.CellColIndex,
            item.CellType,
            item.CellTitle,
            item.CellDescription,
            item.CellCost,
            item.Notes,
            item.TechnicalCancellationReasonCode,
            item.PublicCancellationSummary,
            item.TechnicalCancellationStage,
            item.PurchasesRefunded,
            item.CellMedia.Select(ToDto).ToArray(),
            item.Participants.Select(ToDto).ToArray(),
            item.Modifiers.Select(ToDto).ToArray()
        );
    }

    public static GameHistoryRoundParticipantItemDto ToDto(
        this GameHistoryRoundParticipantItem item
    )
    {
        return new GameHistoryRoundParticipantItemDto(
            item.UserId.ToString(),
            item.DisplayName,
            item.CreatedAtUtc
        );
    }

    public static GameHistoryRoundModifierItemDto ToDto(
        this GameHistoryRoundModifierItem item
    )
    {
        return new GameHistoryRoundModifierItemDto(
            item.ModifierResultId.ToString(),
            item.ModifierId.ToString(),
            item.ModifierName,
            item.IconEmoji,
            item.ModifierDescription,
            item.ModifierCategory,
            item.OutcomeStatus,
            item.ScoreDelta,
            item.KillDelta,
            item.MultiplierApplied,
            item.ResolutionDataJson,
            item.ResolvedByUserId?.ToString(),
            item.ResolvedAtUtc,
            item.ActivationId.ToString(),
            item.DefinitionRevision,
            item.ResolutionKind,
            item.ViolationComment
        );
    }

    public static GameHistoryQuizQuestionSessionItemDto ToDto(this GameHistoryQuizQuestionSessionItem item, string mediaBaseUrl)
    {
        return new GameHistoryQuizQuestionSessionItemDto(
            item.QuestionSessionId.ToString(),
            item.QuestionId.ToString(),
            item.QuestionCode,
            item.QuestionText,
            item.CategoryName,
            item.Reward,
            item.Status,
            item.AskedAtUtc,
            item.ClosedAtUtc,
            item.CorrectOptionId?.ToString(),
            item.Options.Select(option => new GameQuizOptionDto(
                option.OptionId.ToString(), option.Text, option.DisplayOrder)).ToArray(),
            item.Submissions.Select(submission => new GameHistoryQuizSubmissionItemDto(
                submission.UserId.ToString(), submission.DisplayName,
                submission.SelectedOptionId.ToString(), submission.SelectedOptionText,
                submission.IsCorrect, submission.AwardedPoints, submission.SubmittedAtUtc)).ToArray()
        )
        { Image = item.Image?.ToDto(mediaBaseUrl) };
    }

    public static GameHistoryQuizManualAwardItemDto ToDto(this GameHistoryQuizManualAwardItem item)
    {
        return new GameHistoryQuizManualAwardItemDto(
            item.AwardId.ToString(),
            item.AwardedToUserId.ToString(),
            item.AwardedToDisplayName,
            item.AwardedByUserId.ToString(),
            item.AwardedByDisplayName,
            item.AwardedPoints,
            item.OperationType,
            item.Reason,
            item.AwardedAtUtc
        );
    }

}
