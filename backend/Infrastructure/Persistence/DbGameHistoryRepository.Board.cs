using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameHistoryRepository
{
    private async Task<GameBoardSnapshot?> LoadFinishedBoardAsync(
        Guid gameId,
        CancellationToken cancellationToken
    )
    {
        var board = await _dbContext.GameBoards.AsNoTracking()
            .Where(x => x.GameId == gameId && !x.Game.IsDeleted && x.Game.Status == GameStatusValue.Finished)
            .Select(x => new
            {
                x.Id,
                x.Version,
                x.Rows,
                x.Cols,
                x.RowLabels,
                x.ColLabels,
                x.Game.Title,
                x.Game.Description,
                x.Game.QuizAnswerDurationSeconds
            })
            .SingleOrDefaultAsync(cancellationToken);
        if (board is null) return null;

        var cells = await _dbContext.BoardCells.AsNoTracking()
            .Where(x => x.BoardId == board.Id)
            .OrderBy(x => x.RowIndex).ThenBy(x => x.ColIndex)
            .Select(x => new GameBoardCellProjection.RawCell(
                x.Id, x.RowIndex, x.ColIndex, x.CellType, x.Title, x.Description, x.Cost, x.State))
            .ToListAsync(cancellationToken);
        var revealedIds = cells.Where(x => x.State != BoardCellState.Closed).Select(x => x.Id).ToArray();
        var media = await GameBoardCellProjection.LoadMediaByCellIdAsync(
            _dbContext, _storagePublicBaseUrl, revealedIds, cancellationToken);

        return new GameBoardSnapshot(
            gameId.ToString(), board.Title, board.Description, GameStatusValue.Finished,
            board.Version, board.Rows, board.Cols, board.RowLabels, board.ColLabels,
            cells.Select(x => GameBoardCellProjection.MapCell(x, media, revealClosedContent: false)).ToArray(),
            [], [], null, [], board.QuizAnswerDurationSeconds
        );
    }
}
