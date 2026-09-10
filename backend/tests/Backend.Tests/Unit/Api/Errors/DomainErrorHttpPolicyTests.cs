using backend.Api.Errors;
using backend.Application.Contracts;
using backend.Messaging;
using Microsoft.AspNetCore.Http;

namespace Backend.Tests.Unit.Api.Errors;

public sealed class DomainErrorHttpPolicyTests
{
    [Fact]
    public void RegistrationPolicy_ShouldCoverEveryRegistrationErrorCode()
    {
        var errors = Enum.GetValues<GameRegistrationErrorCode>();

        foreach (var error in errors)
        {
            var descriptor = DomainErrorHttpPolicy.FromRegistration(error);
            Assert.True(descriptor.StatusCode is >= 400 and < 600);
            Assert.False(string.IsNullOrWhiteSpace(descriptor.Error));
            Assert.False(string.IsNullOrWhiteSpace(descriptor.Code));
        }
    }

    [Fact]
    public void LifecyclePolicy_ShouldCoverEveryLifecycleErrorCode()
    {
        var errors = Enum.GetValues<GameLifecycleErrorCode>();

        foreach (var error in errors)
        {
            var descriptor = DomainErrorHttpPolicy.FromLifecycle(error);
            Assert.True(descriptor.StatusCode is >= 400 and < 600);
            Assert.False(string.IsNullOrWhiteSpace(descriptor.Error));
            Assert.False(string.IsNullOrWhiteSpace(descriptor.Code));
        }
    }

    [Fact]
    public void RegistrationNotOpen_ShouldStayStableForClients()
    {
        var descriptor = DomainErrorHttpPolicy.FromRegistration(GameRegistrationErrorCode.GameNotInReady);

        Assert.Equal(StatusCodes.Status404NotFound, descriptor.StatusCode);
        Assert.Equal(AppMessages.Client.GameRegistrationNotOpen, descriptor.Error);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationNotOpen, descriptor.Code);
    }

    [Fact]
    public void LifecycleNotReady_ShouldStayStableForClients()
    {
        var descriptor = DomainErrorHttpPolicy.FromLifecycle(GameLifecycleErrorCode.GameNotReady);

        Assert.Equal(StatusCodes.Status404NotFound, descriptor.StatusCode);
        Assert.Equal(AppMessages.Client.GameNotReadyForStart, descriptor.Error);
        Assert.Equal(AppMessages.ErrorCodes.GameLifecycleGameNotReady, descriptor.Code);
    }
}
