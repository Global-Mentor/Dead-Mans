namespace backend.Application.Contracts;

public sealed record GameSetupCellUpdate(string? CellId, int Row, int Col, string? Title, int Cost);

public sealed record GameSetupDraftUpdate(
    string Title,
    IReadOnlyList<string> RowLabels,
    IReadOnlyList<string> ColLabels,
    IReadOnlyList<GameSetupCellUpdate> Cells
);
