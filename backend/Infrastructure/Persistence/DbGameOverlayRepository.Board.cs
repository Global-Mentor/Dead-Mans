using backend.Application.Contracts;
using backend.Application.Features.GameRounds;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameOverlayRepository
{
    private async Task<GameOverlaySnapshot> ReadBoardAsync(Guid gameId, GameOverlayTeam activeTeam,
        CancellationToken cancellationToken)
    {
        var board = await db.GameBoards.AsNoTracking()
            .Where(board => board.GameId == gameId)
            .Select(board => new { board.Id, board.RowLabels, board.ColLabels })
            .SingleAsync(cancellationToken);
        var boardCells = await db.BoardCells.AsNoTracking()
            .Where(cell => cell.BoardId == board.Id)
            .OrderBy(cell => cell.RowIndex).ThenBy(cell => cell.ColIndex)
            .Select(cell => new
            {
                cell.Id,
                cell.RowIndex,
                cell.ColIndex,
                cell.Cost,
                cell.State,
                Title = cell.State == BoardCellState.Closed ? null : cell.Title,
                Image = cell.MediaLinks.Where(media => cell.State != BoardCellState.Closed
                        && EF.Functions.Like(media.MediaAsset.MimeType, "image/%"))
                    .OrderBy(media => media.SortOrder).ThenBy(media => media.Id)
                    .Select(media => new { media.MediaAsset.Bucket, media.MediaAsset.ObjectKey }).FirstOrDefault()
            }).ToArrayAsync(cancellationToken);
        var latestRoundIds = db.GameRounds.AsNoTracking()
            .Where(item => item.GameId == gameId && item.BoardId == board.Id
                && item.BoardCell.State != BoardCellState.Closed && item.FinishedAtUtc != null
                && (item.Status == GameRoundStatusValue.Completed || item.Status == GameRoundStatusValue.Cancelled))
            .GroupBy(item => item.BoardCellId)
            .Select(group => group.OrderByDescending(item => item.FinishedAtUtc).ThenByDescending(item => item.Id)
                .Select(item => item.Id).First());
        var finishedRounds = await db.GameRounds.AsNoTracking().Where(item => latestRoundIds.Contains(item.Id))
            .Select(item => new
            {
                item.BoardCellId,
                item.CellTitleSnapshot,
                item.Team.Name,
                item.TeamSlotIndexSnapshot,
                item.FinalScore,
                Image = item.CellMedia.Where(media => EF.Functions.Like(media.MimeType, "image/%"))
                    .OrderBy(media => media.SortOrder).ThenBy(media => media.Id)
                    .Select(media => new { media.Bucket, media.ObjectKey }).FirstOrDefault()
            }).ToArrayAsync(cancellationToken);
        var results = finishedRounds.ToDictionary(item => item.BoardCellId);
        var cells = boardCells.Select(cell =>
        {
            var finished = results.GetValueOrDefault(cell.Id);
            GameOverlayCellResult? result = null;
            if (finished is not null)
            {
                var finalScore = finished.FinalScore ?? throw new InvalidOperationException("Finished round has no saved score.");
                result = new GameOverlayCellResult(finished.Name, finished.TeamSlotIndexSnapshot,
                    finalScore, GameRoundScoreCalculator.CalculatePenaltyTotal(finalScore));
            }
            var image = finished is null ? cell.Image : finished.Image;
            return new GameOverlayCell(cell.RowIndex, cell.ColIndex, cell.Cost,
                cell.State == BoardCellState.Closed ? "closed" : cell.State == BoardCellState.Open ? "open" : "cancelled",
                finished?.CellTitleSnapshot ?? cell.Title,
                image is null ? null : GameBoardMediaUrlBuilder.Build(storageOptions.Value.PublicBaseUrl, image.Bucket, image.ObjectKey), result);
        }).ToArray();
        var hasClosedCells = cells.Any(cell => cell.State == "closed");
        return new GameOverlaySnapshot(gameId.ToString(), hasClosedCells ? "select_card" : "idle",
            activeTeam, hasClosedCells ? new GameOverlayBoard(board.RowLabels, board.ColLabels, cells) : null);
    }
}
