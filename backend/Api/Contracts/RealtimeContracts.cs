namespace backend.Api.Contracts;

public sealed record GameCellOpenedEventDto(
    string GameId,
    int Version,
    GameBoardCellDto Cell
);

public sealed record GameSetupDraftChangedEventDto();
