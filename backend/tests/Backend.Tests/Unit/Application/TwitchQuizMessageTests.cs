using backend.Application.Contracts;

namespace Backend.Tests.Unit.Application;

public sealed class TwitchQuizMessageTests
{
    [Fact]
    public void EventSubSignature_VerifiesExactRawBodyAndRejectsMutation()
    {
        var body = System.Text.Encoding.UTF8.GetBytes("{\"event\":\"✓\"}");
        const string id = "notification-1";
        const string timestamp = "2026-09-20T18:00:00Z";
        const string secret = "local-test-webhook-secret";
        using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(secret));
        var signature = "sha256=" + Convert.ToHexString(hmac.ComputeHash(
            System.Text.Encoding.UTF8.GetBytes(id + timestamp).Concat(body).ToArray())).ToLowerInvariant();

        Assert.True(TwitchEventSubSignatureVerifier.Verify(id, timestamp, body, signature, secret));
        Assert.False(TwitchEventSubSignatureVerifier.Verify(id, timestamp, body.Concat(new byte[] { 0x20 }).ToArray(), signature, secret));
    }

    [Theory]
    [InlineData("!1", 1)]
    [InlineData("  !10  ", 10)]
    [InlineData("\t!7\r\n", 7)]
    public void AnswerParser_AcceptsOnlyStandaloneSupportedCommands(string input, int expected)
    {
        Assert.True(TwitchQuizChatCommandParser.TryParseAnswer(input, out var actual));
        Assert.Equal(expected, actual);
    }

    [Theory]
    [InlineData("1")]
    [InlineData("!0")]
    [InlineData("!11")]
    [InlineData("!1 hello")]
    [InlineData("hello !1")]
    [InlineData("!points")]
    public void AnswerParser_IgnoresEverythingElse(string input)
    {
        Assert.False(TwitchQuizChatCommandParser.TryParseAnswer(input, out _));
    }

    [Fact]
    public void Formatter_UsesOneNormalizedOrderForQuestionOptionsAndResult()
    {
        var options = new[] { "  Меркурии\u0306 ", "Венера" };
        var preview = TwitchQuizMessageFormatter.FormatForValidation(" Планета? ", options, 60, 10);

        Assert.True(preview.IsCompatible);
        Assert.Equal("Вопрос №999999: Планета?", preview.Question);
        Assert.Contains("!1 [Меркурий] | !2 [Венера]", preview.Options, StringComparison.Ordinal);
        Assert.Equal(preview.Question, preview.Question.Normalize());
        Assert.Equal(preview.Options, preview.Options.Normalize());
    }

    [Fact]
    public void Formatter_FoldsWhitespaceAndUsesBracketedAnswerInResults()
    {
        Assert.Equal("Вопрос №1: Сколько будет 2 + 2?", TwitchQuizMessageFormatter.FormatQuestion(1, "Сколько\nбудет\t2 + 2?"));
        Assert.StartsWith("!1 [3] | !2 [4] | На ответ: 30 секунд.", TwitchQuizMessageFormatter.FormatOptions(["3", "4"], 30));
        Assert.StartsWith("Правильный ответ: !2 [4].", TwitchQuizMessageFormatter.FormatResult(2, "4", 1, 2, 10));
        Assert.Equal("a - b - c", TwitchQuizMessageFormatter.Normalize("a \u2014 b \u2013 c"));
    }

    [Fact]
    public void Formatter_ReportsTheWholeOptionsMessageOverLimitWithoutTruncation()
    {
        var options = Enumerable.Range(1, 10).Select(index => new string((char)('а' + index), 60)).ToArray();
        var preview = TwitchQuizMessageFormatter.FormatForValidation("Q", options, 3600, int.MaxValue);

        Assert.False(preview.IsCompatible);
        Assert.Equal("twitch_quiz.options_message_too_long", preview.ErrorCode);
        Assert.True(preview.OptionsLength > TwitchQuizMessageFormatter.MaximumMessageLength);
    }

    [Theory]
    [InlineData(0, 0, 10, "Ответов не было")]
    [InlineData(0, 7, 10, "Никто из 7 участников")]
    [InlineData(3, 7, 10, "Каждому начислено 10 очков")]
    [InlineData(21, 21, 1, "Верно ответил 21")]
    public void ResultFormatter_UsesTruthfulAwardWording(int correct, int total, int reward, string expected)
    {
        Assert.Contains(expected, TwitchQuizMessageFormatter.FormatResult(1, "Ответ", correct, total, reward), StringComparison.Ordinal);
    }
}
