using backend.Domain.Questions;

namespace backend.Application.Contracts;

public sealed record UserProfile(Guid UserId, string Login, string DisplayName, string? ProfileImageUrl,
    int PlayerGameCount, int QuizGameCount, int AnswerCount, int CorrectAnswerCount, UserProfileStatistics Statistics);

public sealed record UserProfileStatistics(int FinishedPlayerGameCount, int CompletedRoundCount,
    int AwardedQuizPoints, UserProfileGameStatistics Games, UserProfileQuizStatistics Quiz,
    UserProfilePointStatistics Points, UserProfileModifierStatistics Modifiers, UserProfileActivityStatistics Activity);

public sealed record UserProfileGameStatistics(int PlayedGameCount, int RankedGameCount, int WinCount, int PodiumCount,
    int? BestPlacement, int TeamCount, int TeammateCount, int TotalRoundScore, int? BestRoundScore, int TeamKills, int TeamBounties, decimal AverageRoundScore);

public sealed record UserProfileQuizStatistics(int AnswerCount, int CorrectAnswerCount, int IncorrectAnswerCount,
    UserProfileQuizFormatStatistics Text, UserProfileQuizFormatStatistics Screenshot, int LongestCorrectStreak,
    int MaxCorrectAnswersPerGame, int MaxPointsPerGame, IReadOnlyList<UserProfileQuizCategoryStatistics> Categories, decimal AverageAnswerPoints);

public sealed record UserProfileQuizFormatStatistics(int AnswerCount, int CorrectAnswerCount, int Points);
public sealed record UserProfileQuizCategoryStatistics(string Name, int AnswerCount, int CorrectAnswerCount, int Points);
public sealed record UserProfilePointStatistics(int ManualAwarded, int ManualDeducted, int Spent, int Refunded, int NetSpent, decimal AveragePaidOrderCost);
public sealed record UserProfileModifierStatistics(int OrderedCount, int PaidCount, int FreeCount, int AppliedCount,
    int CancelledCount, int PendingCount, int UniqueCount, int GameCount, int RoundCount,
    UserProfileModifierCount? MostUsed, IReadOnlyList<UserProfileModifierCount> Categories,
    IReadOnlyList<UserProfileModifierOutcomeCount> Outcomes);
public sealed record UserProfileModifierCount(string Name, int Count);
public sealed record UserProfileModifierOutcomeCount(string Outcome, int Count);
public sealed record UserProfileActivityStatistics(DateTime? FirstActivityAtUtc, DateTime? LastActivityAtUtc,
    int ActiveDayCount, IReadOnlyList<UserProfileActivityMonth> Months);
public sealed record UserProfileActivityMonth(string Month, int GameCount, int RoundCount, int AnswerCount, int ModifierCount);

public enum UserProfileParticipation { Player, Quiz }

public sealed record UserProfileGame(Guid GameId, string Title, string Status, DateTime? StartedAtUtc,
    DateTime? FinishedAtUtc, int CompletedRoundCount, int AnswerCount, int CorrectAnswerCount);

public sealed record UserProfileGamesPage(IReadOnlyList<UserProfileGame> Items, int TotalCount, int Page, int PageSize);

public sealed record UserProfileAnswer(Guid QuestionSessionId, Guid QuestionId, Guid GameId, string GameTitle,
    string QuestionText, string CategoryName, Guid SelectedOptionId, string SelectedOptionText,
    bool IsCorrect, int AwardedPoints, DateTime SubmittedAtUtc, QuizImageSnapshot? Image);

public sealed record UserProfileAnswersPage(IReadOnlyList<UserProfileAnswer> Items, int TotalCount, int Page, int PageSize);
