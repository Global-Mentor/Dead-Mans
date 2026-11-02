using backend.Domain.Questions;

namespace Backend.Tests.Unit.Domain;

public sealed class QuizQuestionSelectionTests
{
    [Fact]
    public void UnusedQuestionPrecedesHigherPriorityUsedQuestion()
    {
        var rows = new[] { (Id: 1, Usage: 0, Priority: -10), (Id: 2, Usage: 1, Priority: 100) };
        Assert.Equal(1, QuizQuestionSelection.Select(rows, x => x.Usage, x => x.Priority).Id);
    }

    [Fact]
    public void PriorityBreaksUsageTie_ButDoesNotOverrideUsage()
    {
        var rows = new[] { (Id: 1, Usage: 2, Priority: 0), (Id: 2, Usage: 2, Priority: 3), (Id: 3, Usage: 3, Priority: 100) };
        Assert.Equal(2, QuizQuestionSelection.Select(rows, x => x.Usage, x => x.Priority).Id);
    }

    [Fact]
    public void EqualCandidatesRemainEligibleRegardlessOfTheirSharedLocation()
    {
        var rows = new[] { (Id: 1, Location: "same"), (Id: 2, Location: "same") };
        Assert.Contains(QuizQuestionSelection.Select(rows, _ => 0, _ => 0), rows);
    }
}
