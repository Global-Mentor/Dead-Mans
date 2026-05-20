using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Application.Features.GameSetup;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Models;
using backend.Domain.Persistence;
using backend.Messaging;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace backend.Infrastructure.Persistence;

public sealed class DbGameSetupRepository : IGameSetupRepository
{
    private const string SingleDraftConstraintName = "UX_games_single_draft";

    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<DbGameSetupRepository> _logger;

    public DbGameSetupRepository(ApplicationDbContext dbContext, ILogger<DbGameSetupRepository> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<GameBoardSnapshot?> GetLatestDraftSetupSnapshotAsync(
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var selected = await QueryDraftBoards()
                .Select(row => row.Board)
                .FirstOrDefaultAsync(cancellationToken);
            if (selected is null)
            {
                return null;
            }

            return await BuildSnapshotAsync(selected, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, AppMessages.Logs.GameSetupDraftLoadFailed);
            throw;
        }
    }

    public Task<bool> DraftGameExistsAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.Games
            .AsNoTracking()
            .AnyAsync(game => game.Status == GameStatusValue.Draft, cancellationToken);
    }

    public async Task<GameBoardSnapshot?> CreateDraftSetupAsync(
        string title,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var utcNow = DateTime.UtcNow;
            var gameId = Guid.NewGuid();
            var boardId = Guid.NewGuid();
            var columnLabels = GameSetupStubDefaults.BuildColumnLabels();

            var game = new Game
            {
                Id = gameId,
                Title = title,
                Description = null,
                Status = GameStatusValue.Draft,
                CreatedAtUtc = utcNow,
                StartedAtUtc = null,
                FinishedAtUtc = null
            };

            var board = new GameBoard
            {
                Id = boardId,
                GameId = gameId,
                Version = 1,
                Rows = GameSetupStubDefaults.Rows,
                Cols = GameSetupStubDefaults.Cols,
                RowLabels = GameSetupStubDefaults.RowLabels,
                ColLabels = columnLabels,
                CreatedAtUtc = utcNow
            };

            var cells = new List<BoardCell>(GameSetupStubDefaults.Rows * GameSetupStubDefaults.Cols);
            for (var row = 0; row < GameSetupStubDefaults.Rows; row += 1)
            {
                for (var col = 0; col < GameSetupStubDefaults.Cols; col += 1)
                {
                    cells.Add(
                        new BoardCell
                        {
                            Id = Guid.NewGuid(),
                            BoardId = boardId,
                            RowIndex = row,
                            ColIndex = col,
                            State = BoardCellState.Closed,
                            CellType = BoardCellPersistence.DefaultCellType,
                            Title = GameSetupStubDefaults.GetCellTitle(row, col),
                            Cost = GameSetupStubDefaults.GetCellCost(col),
                            Description = null
                        }
                    );
                }
            }

            _dbContext.Games.Add(game);
            _dbContext.GameBoards.Add(board);
            _dbContext.BoardCells.AddRange(cells);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                AppMessages.Logs.GameSetupDraftCreated,
                gameId,
                cells.Count
            );

            return await BuildSnapshotAsync(
                new SelectedBoard(
                    boardId,
                    gameId,
                    title,
                    null,
                    GameStatusValue.Draft,
                    board.Version,
                    board.Rows,
                    board.Cols,
                    board.RowLabels,
                    board.ColLabels
                ),
                cancellationToken
            );
        }
        catch (DbUpdateException ex) when (IsSingleDraftUniqueViolation(ex))
        {
            _logger.LogInformation(AppMessages.Logs.GameSetupDraftAlreadyExists);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, AppMessages.Logs.GameSetupDraftCreateFailed);
            throw;
        }
    }

    private async Task<GameBoardSnapshot> BuildSnapshotAsync(
        SelectedBoard board,
        CancellationToken cancellationToken
    )
    {
        var rawCells = await _dbContext.BoardCells
            .AsNoTracking()
            .Where(cell => cell.BoardId == board.BoardId)
            .OrderBy(cell => cell.RowIndex)
            .ThenBy(cell => cell.ColIndex)
            .Select(cell => new RawCell(
                cell.Id,
                cell.RowIndex,
                cell.ColIndex,
                cell.CellType,
                cell.Title,
                cell.Description,
                cell.Cost,
                cell.State
            ))
            .ToListAsync(cancellationToken);

        var resultCells = rawCells
            .Select(cell => MapCell(cell))
            .ToArray();

        return new GameBoardSnapshot(
            board.GameId.ToString(),
            board.Title,
            board.Description,
            board.Status,
            board.Version,
            board.Rows,
            board.Cols,
            board.RowLabels,
            board.ColLabels,
            resultCells
        );
    }

    private static GameBoardCell MapCell(RawCell cell)
    {
        var state = cell.State == BoardCellState.Open ? GameBoardCellState.Open : GameBoardCellState.Closed;

        return new GameBoardCell(
            cell.Id.ToString(),
            cell.Row,
            cell.Col,
            cell.CellType,
            cell.Title,
            cell.Description,
            cell.Cost,
            state,
            []
        );
    }

    private static bool IsSingleDraftUniqueViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgresException
            && postgresException.SqlState == PostgresErrorCodes.UniqueViolation
            && postgresException.ConstraintName == SingleDraftConstraintName;
    }

    private IQueryable<BoardSelectionRow> QueryDraftBoards()
    {
        return _dbContext.Games
            .AsNoTracking()
            .Where(game => game.Status == GameStatusValue.Draft)
            .Join(
                _dbContext.GameBoards.AsNoTracking(),
                game => game.Id,
                board => board.GameId,
                (game, board) => new
                {
                    board.Id,
                    GameId = game.Id,
                    game.Title,
                    game.Description,
                    game.Status,
                    board.Version,
                    board.Rows,
                    board.Cols,
                    board.RowLabels,
                    board.ColLabels,
                    game.CreatedAtUtc
                }
            )
            .OrderByDescending(row => row.CreatedAtUtc)
            .Select(row => new BoardSelectionRow(
                new SelectedBoard(
                    row.Id,
                    row.GameId,
                    row.Title,
                    row.Description,
                    row.Status,
                    row.Version,
                    row.Rows,
                    row.Cols,
                    row.RowLabels,
                    row.ColLabels
                )
            ));
    }

    private sealed record BoardSelectionRow(SelectedBoard Board);

    private sealed record RawCell(
        Guid Id,
        int Row,
        int Col,
        string CellType,
        string? Title,
        string? Description,
        int Cost,
        BoardCellState State
    );

    private sealed record SelectedBoard(
        Guid BoardId,
        Guid GameId,
        string Title,
        string? Description,
        string Status,
        int Version,
        int Rows,
        int Cols,
        string[] RowLabels,
        string[] ColLabels
    );
}
