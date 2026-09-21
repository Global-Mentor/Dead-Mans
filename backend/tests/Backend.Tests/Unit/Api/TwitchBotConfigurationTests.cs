using backend.Api.DependencyInjection;
using backend.Application.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Backend.Tests.Unit.Api;

public sealed class TwitchBotConfigurationTests
{
    [Theory]
    [InlineData("TwitchBot")]
    [InlineData("TwitchQuiz")]
    public void EnabledBot_AcceptsCanonicalAndLegacyConfiguration(string section)
    {
        var values = CompleteConfiguration(section);
        var options = Resolve(values);
        Assert.True(options.Enabled);
        Assert.Equal("bot-client", options.ClientId);
        Assert.Equal("test-client-secret", options.ClientSecret);
        Assert.Equal("https://example.test/api/integrations/twitch/eventsub", options.WebhookCallbackUrl);
    }

    [Fact]
    public void CanonicalValues_OverrideLegacyWithoutDiscardingUnspecifiedSecrets()
    {
        var values = CompleteConfiguration("TwitchQuiz");
        values["TwitchBot:Enabled"] = "false";
        values["TwitchBot:ClientId"] = "new-client";
        var options = Resolve(values);
        Assert.False(options.Enabled);
        Assert.Equal("new-client", options.ClientId);
        Assert.Equal("test-client-secret", options.ClientSecret);
    }

    [Fact]
    public void ExplicitEmptyCanonicalSecret_DoesNotSilentlyReuseLegacySecret()
    {
        var values = CompleteConfiguration("TwitchQuiz");
        values["TwitchBot:ClientSecret"] = "";
        Assert.Throws<OptionsValidationException>(() => Resolve(values));
    }

    [Fact]
    public void UnconfiguredBot_IsDisabledByDefault()
    {
        Assert.False(Resolve([]).Enabled);
    }

    [Fact]
    public void Production_StillRejectsInsecureCallbackAfterRename()
    {
        var values = CompleteConfiguration("TwitchBot");
        values["TwitchBot:OAuthCallbackUrl"] = "http://example.test/oauth/callback";
        Assert.Throws<OptionsValidationException>(() => Resolve(values));
    }

    private static Dictionary<string, string?> CompleteConfiguration(string section) => new()
    {
        [$"{section}:Enabled"] = "true",
        [$"{section}:ClientId"] = "bot-client",
        [$"{section}:ClientSecret"] = "test-client-secret",
        [$"{section}:WebhookSecret"] = "test-production-webhook-secret",
        [$"{section}:WebhookCallbackUrl"] = "https://example.test/api/integrations/twitch/eventsub",
        [$"{section}:OAuthCallbackUrl"] = "https://example.test/api/integrations/twitch/oauth/callback",
        [$"{section}:FrontendRedirectUrl"] = "https://example.test/panel/game-quiz",
        [$"{section}:ExpectedBotUserId"] = "100001",
        [$"{section}:ExpectedBroadcasterUserId"] = "200001"
    };

    private static TwitchBotOptions Resolve(Dictionary<string, string?> values)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(values).Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDeadMansHostSecurity(configuration, new TestHostEnvironment());
        using var provider = services.BuildServiceProvider();
        return provider.GetRequiredService<IOptions<TwitchBotOptions>>().Value;
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "Backend.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
