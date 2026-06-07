using backend.Domain.Persistence;

namespace backend.Data.Entities;

public class GameQuestionRound
{
    public Guid Id { get; set; }

    public Guid GameId { get; set; }

    public Guid QuestionId { get; set; }

    public int AskOrder { get; set; }

    public DateTime AskedAtUtc { get; set; }

    public Guid? AskedByUserId { get; set; }

    public string Status { get; set; } = GameQuestionRoundStatusValue.Asked;

    public DateTime? AnsweredAtUtc { get; set; }

    public Guid? AnsweredByUserId { get; set; }

    public string? AnsweredByDisplayName { get; set; }

    public string? SubmittedAnswer { get; set; }

    public bool? IsCorrect { get; set; }

    public int? AwardedPoints { get; set; }

    public Game? Game { get; set; }

    public QuestionDefinition? Question { get; set; }
}
