using backend.Infrastructure.Realtime;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Tests.Unit.Infrastructure.Realtime;

public sealed class SignalRGameSetupEventsPublisherTests
{
    [Fact]
    public async Task PublishDraftChangedAsync_SendsDraftChangedEventToAllClients()
    {
        var proxy = new RecordingClientProxy();
        var hubContext = new FakeHubContext(new FakeHubClients(proxy));
        var publisher = new SignalRGameSetupEventsPublisher(hubContext);

        await publisher.PublishDraftChangedAsync();

        Assert.Equal(SignalRGameSetupEventsPublisher.DraftChangedEventName, proxy.Method);
        Assert.Empty(proxy.Args ?? []);
    }

    private sealed class FakeHubContext : IHubContext<GameSetupHub>
    {
        public FakeHubContext(IHubClients clients)
        {
            Clients = clients;
        }

        public IHubClients Clients { get; }
        public IGroupManager Groups => throw new NotSupportedException();
        public IUserIdProvider UserIdProvider => throw new NotSupportedException();
    }

    private sealed class FakeHubClients : IHubClients
    {
        public FakeHubClients(IClientProxy proxy)
        {
            All = proxy;
        }

        public IClientProxy All { get; }
        public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => All;
        public IClientProxy Client(string connectionId) => throw new NotSupportedException();
        public IClientProxy Clients(IReadOnlyList<string> connectionIds) => throw new NotSupportedException();
        public IClientProxy Group(string groupName) => throw new NotSupportedException();
        public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) =>
            throw new NotSupportedException();
        public IClientProxy Groups(IReadOnlyList<string> groupNames) => throw new NotSupportedException();
        public IClientProxy User(string userId) => throw new NotSupportedException();
        public IClientProxy Users(IReadOnlyList<string> userIds) => throw new NotSupportedException();
    }

    private sealed class RecordingClientProxy : IClientProxy
    {
        public string? Method { get; private set; }
        public object?[]? Args { get; private set; }

        public Task SendCoreAsync(string methodName, object?[] args, CancellationToken cancellationToken = default)
        {
            Method = methodName;
            Args = args;
            return Task.CompletedTask;
        }
    }
}
