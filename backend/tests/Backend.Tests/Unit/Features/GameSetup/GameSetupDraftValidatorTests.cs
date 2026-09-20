using backend.Application.Features.GameSetup;

namespace Backend.Tests.Unit.Features.GameSetup;

public sealed class GameSetupDraftValidatorTests
{
    [Theory]
    [InlineData(24, true)]
    [InlineData(25, false)]
    public void TryNormalizeLabels_EnforcesReadableBoardLabelLength(int length, bool expected)
    {
        var labels = new[] { new string('x', length) };

        Assert.Equal(expected, GameSetupDraftValidator.TryNormalizeRowLabels(labels, out _));
        Assert.Equal(expected, GameSetupDraftValidator.TryNormalizeColumnLabels(labels, out _));
    }
}
