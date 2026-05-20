namespace backend.Application.Features.GameSetup;

/// <summary>Default board shape and stub field values for a newly created draft game.</summary>
public static class GameSetupStubDefaults
{
    public const int Rows = 6;
    public const int Cols = 5;

    public static readonly string[] RowLabels = ["A", "B", "C", "D", "E", "F"];

    public static string[] BuildColumnLabels()
    {
        return Enumerable.Range(0, Cols).Select(GetColumnLabel).ToArray();
    }

    public static string GetColumnLabel(int columnIndex) => $"Column {columnIndex + 1}";

    public static string GetCellTitle(int rowIndex, int columnIndex) =>
        $"Card {rowIndex + 1}-{columnIndex + 1}";

    public static int GetCellCost(int columnIndex) => (columnIndex + 1) * 100;
}
