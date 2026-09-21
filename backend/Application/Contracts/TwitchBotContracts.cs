using System.Security.Cryptography;
using System.Text;

namespace backend.Application.Contracts;

public static class TwitchEventSubSignatureVerifier
{
    public static bool Verify(
        string messageId,
        string timestamp,
        ReadOnlySpan<byte> rawBody,
        string signature,
        string secret)
    {
        if (string.IsNullOrEmpty(messageId) || string.IsNullOrEmpty(timestamp)
            || string.IsNullOrEmpty(signature) || string.IsNullOrEmpty(secret)) return false;
        var prefix = Encoding.UTF8.GetBytes(messageId + timestamp);
        var signed = new byte[prefix.Length + rawBody.Length];
        prefix.CopyTo(signed, 0);
        rawBody.CopyTo(signed.AsSpan(prefix.Length));
        var hash = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), signed);
        var expected = Encoding.ASCII.GetBytes("sha256=" + Convert.ToHexString(hash).ToLowerInvariant());
        var actual = Encoding.ASCII.GetBytes(signature);
        return expected.Length == actual.Length && CryptographicOperations.FixedTimeEquals(expected, actual);
    }
}

public sealed record TwitchBotStatus(
    bool Enabled,
    bool BotConnected,
    bool BroadcasterConnected,
    bool EventSubConnected,
    bool AccessRevoked,
    string? BotUserId,
    string? BroadcasterUserId,
    string? LastError,
    TwitchQuizPublicationState? Publication
);

public sealed record TwitchEventSubMessage(
    string NotificationId,
    DateTime EventTimestampUtc,
    string SubscriptionType,
    string BroadcasterUserId,
    string ChatterUserId,
    string ChatterLogin,
    string ChatterDisplayName,
    string MessageId,
    string MessageText,
    string? SourceBroadcasterUserId
);
