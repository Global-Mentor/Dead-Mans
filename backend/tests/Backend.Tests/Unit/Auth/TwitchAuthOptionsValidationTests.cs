using backend.Application.Abstractions.Auth;

namespace Backend.Tests.Unit.Auth;

public sealed class TwitchAuthOptionsValidationTests
{
    [Theory]
    [InlineData("https://example.com/auth/callback", true, true)]
    [InlineData("http://localhost:5285/auth/callback", false, true)]
    [InlineData("http://example.com/auth/callback", true, false)]
    [InlineData("https://user@example.com/auth/callback", true, false)]
    [InlineData("https://example.com/auth/callback#token", true, false)]
    [InlineData("javascript:alert(1)", false, false)]
    public void IsValidRedirectUri_EnforcesSchemeAndProductionHttps(
        string uri,
        bool requireHttps,
        bool expected
    )
    {
        Assert.Equal(expected, TwitchAuthOptions.IsValidRedirectUri(uri, requireHttps));
    }

    [Fact]
    public void HasOnlySignInScope_AcceptsOnlyOpenId()
    {
        Assert.True(TwitchAuthOptions.HasOnlySignInScope(["openid"]));
        Assert.False(TwitchAuthOptions.HasOnlySignInScope(["openid", "user:read:email"]));
        Assert.False(TwitchAuthOptions.HasOnlySignInScope(["openid", "openid"]));
        Assert.False(TwitchAuthOptions.HasOnlySignInScope(["openid", " "]));
        Assert.False(TwitchAuthOptions.HasOnlySignInScope([]));
    }

    [Fact]
    public void HasValidPermanentSuperAdminTwitchUserIds_RequiresUniquePositiveNumericIds()
    {
        Assert.True(
            TwitchAuthOptions.HasValidPermanentSuperAdminTwitchUserIds(["123456"], true)
        );
        Assert.True(TwitchAuthOptions.HasValidPermanentSuperAdminTwitchUserIds([], false));
        Assert.False(TwitchAuthOptions.HasValidPermanentSuperAdminTwitchUserIds([], true));
        Assert.False(
            TwitchAuthOptions.HasValidPermanentSuperAdminTwitchUserIds(["123456", "123456"], true)
        );
        Assert.False(
            TwitchAuthOptions.HasValidPermanentSuperAdminTwitchUserIds(["GlobalMentor"], true)
        );
        Assert.False(TwitchAuthOptions.HasValidPermanentSuperAdminTwitchUserIds(["0"], true));
    }
}
