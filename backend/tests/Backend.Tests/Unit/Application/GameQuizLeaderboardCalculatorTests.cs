using backend.Application.Contracts;
using backend.Application.Features.Scoring;

namespace Backend.Tests.Unit.Application;

public sealed class GameQuizLeaderboardCalculatorTests
{
    [Fact]
    public void SeparatesAnswerFormats_WhileKeepingAwardsSpendingAndRankingCombined()
    {
        var player = Guid.NewGuid();
        var manualOnly = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var standings = GameQuizLeaderboardCalculator.Calculate([
            new(player, "Player", 10, true, true, now),
            new(player, "Player", 0, true, false, now),
            new(player, "Player", 20, true, true, now, IsScreenshot: true),
            new(player, "Player", 5, false, false, now),
            new(manualOnly, "Manual", 40, false, false, now)
        ], new Dictionary<Guid, long> { [player] = 12 });

        Assert.Equal(manualOnly, standings[0].UserId);
        Assert.Equal(new GameQuizFormatStatistics(0, 0, 0), standings[0].TextStatistics);
        Assert.Equal(new GameQuizFormatStatistics(0, 0, 0), standings[0].ScreenshotStatistics);
        var result = standings[1];
        Assert.Equal(35, result.Points);
        Assert.Equal(23, result.AvailablePoints);
        Assert.Equal(12, result.SpentPoints);
        Assert.Equal(3, result.Attempts);
        Assert.Equal(2, result.CorrectAnswers);
        Assert.Equal(new GameQuizFormatStatistics(2, 1, 10), result.TextStatistics);
        Assert.Equal(new GameQuizFormatStatistics(1, 1, 20), result.ScreenshotStatistics);
    }
}
