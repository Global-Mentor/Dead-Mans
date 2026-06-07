namespace backend.Api.Contracts;

/// <summary>
/// SignalR hub paths and event names. Keep aligned with backend/openapi/deadmans.v1.yaml (x-signalr).
/// </summary>
public static class RealtimeHubContracts
{
    public static class GameBoard
    {
        public const string HubPath = "/hubs/game-board";
        public const string CellOpenedEvent = "cellOpened";
        public const string ModifierActivatedEvent = "modifierActivated";
    }

    public static class GameSetup
    {
        public const string HubPath = "/hubs/game-setup";
        public const string DraftChangedEvent = "draftChanged";
    }
}
