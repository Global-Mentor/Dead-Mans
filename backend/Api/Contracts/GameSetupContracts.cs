namespace backend.Api.Contracts;

public sealed record CreateGameSetupRequestDto(string Title);

public sealed record GameSetupSnapshotDto(
    string GameId,
    string Title,
    string? Description,
    string Status,
    int Version,
    int Rows,
    int Cols,
    IReadOnlyList<string> RowLabels,
    IReadOnlyList<string> ColLabels,
    IReadOnlyList<GameBoardCellDto> Cells
);
