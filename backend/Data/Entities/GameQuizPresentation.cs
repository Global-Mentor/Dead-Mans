namespace backend.Data.Entities;

// Mutable presentation state is separate from immutable question history.
public sealed class GameQuizPresentation
{
    public Guid GameId { get; set; }
    public Guid QuestionSessionId { get; set; }
    public GameQuizQuestionSession QuestionSession { get; set; } = default!;
}
