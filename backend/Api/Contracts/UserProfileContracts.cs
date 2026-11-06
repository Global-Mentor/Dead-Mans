using System.ComponentModel.DataAnnotations;

namespace backend.Api.Contracts;

public sealed class UserProfileGamesQuery
{
    [Required, RegularExpression("^(player|quiz)$")]
    public string Participation { get; set; } = "player";

    [Range(1, 1_000_000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}

public sealed record UserProfileDto(string UserId, string Login, string DisplayName, string? ProfileImageUrl,
    int PlayerGameCount, int QuizGameCount, int AnswerCount, int CorrectAnswerCount, UserProfileStatisticsDto Statistics);

public sealed record UserProfileStatisticsDto(int FinishedPlayerGameCount, int CompletedRoundCount,
    int AwardedQuizPoints, UserProfileGameStatisticsDto Games, UserProfileQuizStatisticsDto Quiz,
    UserProfilePointStatisticsDto Points, UserProfileModifierStatisticsDto Modifiers, UserProfileActivityStatisticsDto Activity);

public sealed record UserProfileGameStatisticsDto(int PlayedGameCount, int RankedGameCount, int WinCount, int PodiumCount,
    int? BestPlacement, int TeamCount, int TeammateCount, int TotalRoundScore, int? BestRoundScore, int TeamKills, int TeamBounties, decimal AverageRoundScore);

public sealed record UserProfileQuizStatisticsDto(int AnswerCount, int CorrectAnswerCount, int IncorrectAnswerCount,
    UserProfileQuizFormatStatisticsDto Text, UserProfileQuizFormatStatisticsDto Screenshot, int LongestCorrectStreak,
    int MaxCorrectAnswersPerGame, int MaxPointsPerGame, IReadOnlyList<UserProfileQuizCategoryStatisticsDto> Categories, decimal AverageAnswerPoints);

public sealed record UserProfileQuizFormatStatisticsDto(int AnswerCount, int CorrectAnswerCount, int Points);
public sealed record UserProfileQuizCategoryStatisticsDto(string Name, int AnswerCount, int CorrectAnswerCount, int Points);
public sealed record UserProfilePointStatisticsDto(int ManualAwarded, int ManualDeducted, int Spent, int Refunded, int NetSpent, decimal AveragePaidOrderCost);
public sealed record UserProfileModifierStatisticsDto(int OrderedCount, int PaidCount, int FreeCount, int AppliedCount,
    int CancelledCount, int PendingCount, int UniqueCount, int GameCount, int RoundCount,
    UserProfileModifierCountDto? MostUsed, IReadOnlyList<UserProfileModifierCountDto> Categories,
    IReadOnlyList<UserProfileModifierOutcomeCountDto> Outcomes);
public sealed record UserProfileModifierCountDto(string Name, int Count);
public sealed record UserProfileModifierOutcomeCountDto(string Outcome, int Count);
public sealed record UserProfileActivityStatisticsDto(DateTime? FirstActivityAtUtc, DateTime? LastActivityAtUtc,
    int ActiveDayCount, IReadOnlyList<UserProfileActivityMonthDto> Months);
public sealed record UserProfileActivityMonthDto(string Month, int GameCount, int RoundCount, int AnswerCount, int ModifierCount);

public sealed record UserProfileGameDto(string GameId, string Title, string Status, DateTime? StartedAtUtc,
    DateTime? FinishedAtUtc, int CompletedRoundCount, int AnswerCount, int CorrectAnswerCount);

public sealed record UserProfileGamesPageDto(IReadOnlyList<UserProfileGameDto> Items, int TotalCount, int Page, int PageSize);

public sealed record UserProfileAnswerDto(string QuestionSessionId, string QuestionId, string GameId, string GameTitle,
    string QuestionText, string CategoryName, string SelectedOptionId, string SelectedOptionText,
    bool IsCorrect, int AwardedPoints, DateTime SubmittedAtUtc, GameQuizImageDto? Image);

public sealed record UserProfileAnswersPageDto(IReadOnlyList<UserProfileAnswerDto> Items, int TotalCount, int Page, int PageSize);
