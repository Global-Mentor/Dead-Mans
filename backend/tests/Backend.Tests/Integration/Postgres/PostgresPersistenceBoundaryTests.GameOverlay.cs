using Microsoft.EntityFrameworkCore;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Configuration;
using backend.Infrastructure.Persistence;
using Microsoft.Extensions.Options;
using backend.Application.Contracts;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    private static readonly Microsoft.AspNetCore.DataProtection.IDataProtectionProvider OverlayProtection =
        new Microsoft.AspNetCore.DataProtection.EphemeralDataProtectionProvider();

    [Fact]
    public async Task GameOverlay_ManualPagePersistsAcrossReaders_ClampsToAvailableTeams_AndResetsWhenHidden()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seed = await SeedPlayableRoundGraphAsync(db, async (context, now, gameId, ownerId) =>
        {
            for (var index = 2; index <= 7; index++)
            {
                var slot = CreateSlot(gameId, index, now);
                var user = CreateUser($"overlay-page-{index}");
                var team = CreateTeam(gameId, slot.Id, now, TeamStatusValue.Confirmed);
                team.CreatedByUserId = ownerId;
                team.ConfirmedAtUtc = now;
                team.ConfirmedByUserId = ownerId;
                context.AddRange(slot, user, team, new GameTeamMember
                {
                    Id = Guid.NewGuid(),
                    GameId = gameId,
                    TeamId = team.Id,
                    UserId = user.Id,
                    JoinedAtUtc = now
                });
            }
            await context.SaveChangesAsync();
        });
        DbGameOverlayRepository Repository(backend.Data.ApplicationDbContext context) =>
            new(context, Options.Create(new StorageOptions()), TimeProvider.System, OverlayProtection);
        var repository = Repository(db);
        Assert.Equal(new GameOverlayLeaderboardState(false, 0, 2), await repository.ReadLeaderboardStateAsync(seed.GameId, default));
        Assert.Equal(new GameOverlayLeaderboardState(true, 1, 2), await repository.SetLeaderboardStateAsync(seed.GameId, true, default, 1));
        await using var observer = _database.CreateDbContext();
        var reconnected = Repository(observer);
        Assert.Equal(new GameOverlayLeaderboardState(true, 1, 2), await reconnected.ReadLeaderboardStateAsync(seed.GameId, default));
        Assert.Equal(1, (await reconnected.ReadAsync(default)).LeaderboardPage);
        Assert.Equal(1, (await repository.SetLeaderboardStateAsync(seed.GameId, true, default, int.MaxValue))!.Page);
        Assert.Equal(0, (await repository.SetLeaderboardStateAsync(seed.GameId, true, default, -1))!.Page);
        await repository.SetLeaderboardStateAsync(seed.GameId, true, default, 1);
        Assert.Equal(new GameOverlayLeaderboardState(false, 0, 2), await repository.SetLeaderboardStateAsync(seed.GameId, false, default));
        Assert.Equal(0, (await repository.SetLeaderboardStateAsync(seed.GameId, true, default))!.Page);
        foreach (var member in await db.GameTeamMembers.Where(row => row.GameId == seed.GameId).ToArrayAsync())
        {
            db.Add(new GameQuizPointLedgerEntry
            {
                Id = Guid.NewGuid(),
                GameId = seed.GameId,
                UserId = member.UserId,
                EntryType = GameQuizPointEntryTypeValue.ManualAdjustment,
                PointsDelta = 100,
                ManualRequestId = Guid.NewGuid(),
                CreatedByUserId = seed.UserId,
                Reason = "Quiz standings test",
                AvailablePointsBefore = 0,
                AvailablePointsAfter = 100,
                OccurredAtUtc = seed.Now
            });
        }
        await db.SaveChangesAsync();
        Assert.Equal(new GameOverlayLeaderboardState(true, 1, 2, "quiz"),
            await repository.SetLeaderboardStateAsync(seed.GameId, true, default, 1, "quiz"));
        Assert.Equal("quiz", (await reconnected.ReadLeaderboardStateAsync(seed.GameId, default))!.Kind);
        var quizFrame = await reconnected.ReadAsync(default);
        Assert.Equal("quiz_leaderboard", quizFrame.Phase);
        Assert.Null(quizFrame.Leaderboard);
        Assert.Equal(7, quizFrame.QuizLeaderboard!.Count);
        Assert.Equal(1, quizFrame.LeaderboardPage);
        await repository.SetLeaderboardStateAsync(seed.GameId, true, default);
        Assert.Null((await reconnected.ReadAsync(default)).QuizLeaderboard);
    }

    [Fact]
    public async Task GameOverlay_LeaderboardOverridesTestAndRound_DurablyWithoutChangingGame_AndRejectsStaleGames()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seed = await SeedPlayableRoundGraphAsync(db);
        var game = await db.Games.SingleAsync(row => row.Id == seed.GameId);
        game.ActiveTeamId = seed.TeamId;
        var round = new GameRound
        {
            Id = Guid.NewGuid(),
            GameId = seed.GameId,
            BoardId = seed.BoardId,
            BoardCellId = seed.CellId,
            TeamId = seed.TeamId,
            Status = GameRoundStatusValue.CardOpened,
            BaseScore = 100,
            CellCostSnapshot = 100,
            CellTitleSnapshot = "Test cell",
            TeamSlotIndexSnapshot = 1,
            CreatedAtUtc = seed.Now,
            UpdatedAtUtc = seed.Now
        };
        db.Add(round);
        await db.SaveChangesAsync();
        var events = new Backend.Tests.Support.OverlayTestEventsPublisher();
        backend.Application.Features.GameOverlay.GameOverlayService Service(backend.Data.ApplicationDbContext context) => new(
            new DbGameOverlayRepository(context, Options.Create(new StorageOptions()), TimeProvider.System, OverlayProtection),
            events, Microsoft.Extensions.Logging.Abstractions.NullLogger<backend.Application.Features.GameOverlay.GameOverlayService>.Instance);
        var service = Service(db);
        var key = await service.RotateKeyAsync(seed.UserId, default);
        Assert.Equal("card_opened", (await service.ReadAsync(key, default)).Phase);
        await service.SetTestEnabledAsync(seed.UserId, true, default);
        Assert.Equal("test", (await service.ReadAsync(key, default)).Phase);
        await service.SetLeaderboardStateAsync(seed.GameId, true, default, kind: "quiz");
        Assert.Equal("quiz_leaderboard", (await service.ReadAsync(key, default)).Phase);
        Assert.True((await service.SetLeaderboardStateAsync(seed.GameId, true, default))!.Enabled);
        Assert.True((await service.SetLeaderboardStateAsync(seed.GameId, true, default))!.Enabled);
        await using var observer = _database.CreateDbContext();
        var reconnected = Service(observer);
        Assert.True((await reconnected.ReadLeaderboardStateAsync(seed.GameId, default))!.Enabled);
        var frame = await reconnected.ReadAsync(key, default);
        Assert.Equal("leaderboard", frame.Phase);
        Assert.NotEmpty(frame.Leaderboard!);
        Assert.Null(frame.Team);
        Assert.Null(frame.Board);
        Assert.Null(frame.Round);
        Assert.Null(frame.Gameplay);
        Assert.Null(frame.Summary);
        Assert.Equal(seed.TeamId, (await observer.Games.AsNoTracking().SingleAsync(row => row.Id == seed.GameId)).ActiveTeamId);
        var unchanged = await observer.GameRounds.AsNoTracking().SingleAsync();
        Assert.Equal(GameRoundStatusValue.CardOpened, unchanged.Status);
        Assert.Equal(1, unchanged.Version);
        Assert.Null(unchanged.GameplayStartedAtUtc);
        events.Fail = true;
        Assert.False((await service.SetLeaderboardStateAsync(seed.GameId, false, default))!.Enabled);
        Assert.Equal("test", (await reconnected.ReadAsync(key, default)).Phase);
        await service.SetTestEnabledAsync(seed.UserId, false, default);
        Assert.Equal("card_opened", (await reconnected.ReadAsync(key, default)).Phase);
        Assert.Null(await service.SetLeaderboardStateAsync(Guid.NewGuid(), true, default));
        var cancelled = await new DbGameRoundRepository(db, TimeProvider.System).TechnicalCancelAsync(round.Id,
            new TechnicalCancelGameRoundInput(1, "operator_error", "Round cancelled", "Test completed"), seed.UserId);
        Assert.Equal(TransitionGameRoundOutcome.Transitioned, cancelled.Outcome);
        db.ChangeTracker.Clear();
        var lifecycle = new DbGameLifecyclePersistence(db,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<DbGameLifecyclePersistence>.Instance, TimeProvider.System);
        var preview = Assert.IsType<GameFinishPreview>((await lifecycle.GetFinishPreviewAsync(seed.GameId)).Preview);
        var finished = await lifecycle.FinishGameAsync(seed.GameId,
            new FinishGameInput(preview.Summary.BoardVersion, Guid.NewGuid(), preview.Warnings.Select(warning => warning.Code).ToHashSet(), null), seed.UserId);
        Assert.Equal(GameLifecycleErrorCode.None, finished.Error);
        Assert.Null(await service.SetLeaderboardStateAsync(seed.GameId, true, default));
        Assert.Null(await service.ReadLeaderboardStateAsync(seed.GameId, default));
        Assert.Equal("idle", (await reconnected.ReadAsync(key, default)).Phase);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task GameOverlay_BroadcastSummaryPersistsSeparately_AndLateDraftCannotReplaceFinalResult(bool markTeamPlayed)
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seed = await SeedPlayableRoundGraphAsync(db);
        var game = await db.Games.FindAsync(seed.GameId) ?? throw new InvalidOperationException();
        game.ActiveTeamId = seed.TeamId;
        var participant = await db.GameTeamMembers.Where(row => row.TeamId == seed.TeamId)
            .Select(row => new { row.UserId, row.User!.DisplayName }).SingleAsync();
        var round = new GameRound
        {
            Id = Guid.NewGuid(),
            GameId = seed.GameId,
            BoardId = seed.BoardId,
            BoardCellId = seed.CellId,
            TeamId = seed.TeamId,
            Status = GameRoundStatusValue.ReviewingResults,
            PreparedAtUtc = seed.Now,
            GameplayStartedAtUtc = seed.Now,
            ReviewedAtUtc = seed.Now,
            CreatedAtUtc = seed.Now,
            UpdatedAtUtc = seed.Now,
            BaseScore = 100,
            CellCostSnapshot = 100,
            CellTitleSnapshot = "Test cell",
            TeamSlotIndexSnapshot = 1
        };
        db.AddRange(round, new GameOverlayKey { OwnerId = seed.UserId, KeyHash = new string('a', 64) },
            new GameRoundParticipant
            {
                Id = Guid.NewGuid(),
                RoundId = round.Id,
                UserId = participant.UserId,
                DisplayNameSnapshot = participant.DisplayName,
                CreatedAtUtc = seed.Now
            });
        await db.SaveChangesAsync();
        var writer = new DbGameRoundRepository(db, TimeProvider.System);
        var input = new BroadcastGameRoundSummaryInput(1, 2, 1, null);
        Assert.Equal(FinalizeGameRoundOutcome.Completed, (await writer.BroadcastSummaryAsync(round.Id, input, seed.UserId)).Outcome);
        await using var observer = _database.CreateDbContext();
        var reader = new DbGameOverlayRepository(observer, Options.Create(new StorageOptions { PublicBaseUrl = "https://media.example.test" }), TimeProvider.System, OverlayProtection);
        var partial = (await reader.ReadAsync(default))!.Summary!;
        Assert.Equal(200, partial.KillsScore);
        Assert.Equal(300, partial.ScoreDetails!.FinalScore);
        var complete = new FinalizeGameRoundInput("completed", 2, 1, "Internal note", [], [], 1, markTeamPlayed);
        Assert.Equal(300, (await writer.BroadcastSummaryAsync(round.Id, input with { CompleteInput = complete }, seed.UserId)).ScoreDetails!.FinalScore);
        Assert.Equal(300, (await reader.ReadAsync(default))!.Summary!.ScoreDetails!.FinalScore);
        Assert.Equal(0, (await observer.GameRounds.AsNoTracking().SingleAsync(row => row.Id == round.Id)).KillsCount);
        Assert.Equal(FinalizeGameRoundOutcome.Completed, (await writer.FinalizeAsync(round.Id, complete, seed.UserId)).Outcome);
        var final = (await reader.ReadAsync(default))!;
        Assert.True(final.Summary!.IsFinal);
        Assert.Equal(300, final.Summary.ScoreDetails!.FinalScore);
        Assert.Equal([participant.DisplayName], final.Team!.Players);
        Assert.Equal(FinalizeGameRoundOutcome.NotInProgress,
            (await writer.BroadcastSummaryAsync(round.Id, input with { KillsCount = 99 }, seed.UserId)).Outcome);
        Assert.Equal(300, (await reader.ReadAsync(default))!.Summary!.ScoreDetails!.FinalScore);
        Assert.Equal(GameRoundStatusValue.ShowingResults, (await writer.GetActiveAsync())!.Status);
        Assert.Equal(StartGameRoundOutcome.RoundAlreadyInProgress,
            (await writer.StartAsync(new(seed.CellId, seed.TeamId), seed.UserId)).Outcome);
        Assert.Equal(TransitionGameRoundOutcome.InvalidState,
            (await writer.TechnicalCancelAsync(round.Id, new(round.Version, "operator_error", null, "Cannot undo results"), seed.UserId)).Outcome);
        Assert.Equal(TransitionGameRoundOutcome.InvalidState,
            (await writer.ResumeGameplayAsync(round.Id, new(round.Version), seed.UserId)).Outcome);
        var boardRepository = new DbGameBoardRepository(db, Options.Create(new StorageOptions()),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<DbGameBoardRepository>.Instance, TimeProvider.System);
        Assert.Equal(SetActiveGameTeamOutcome.RoundInProgress, await boardRepository.SetActiveTeamAsync(null));
        Assert.Null(await boardRepository.TryOpenCellAsync(seed.CellId));
        var immutableError = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => observer.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE game_rounds SET final_score = 999, version = version + 1 WHERE id = {round.Id}"));
        Assert.Equal("55000", immutableError.SqlState);
        var finishGameError = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => observer.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE games SET status = 'finished', finished_at_utc = now(), active_team_id = NULL WHERE id = {seed.GameId}"));
        Assert.Equal("ck_games_finished_runtime_settled", finishGameError.ConstraintName);
        Assert.Equal(TransitionGameRoundOutcome.StaleVersion,
            (await writer.FinishPresentationAsync(round.Id, new(round.Version - 1), seed.UserId)).Outcome);
        var version = round.Version;
        var finishedAt = await observer.GameRounds.Where(row => row.Id == round.Id).Select(row => row.FinishedAtUtc).SingleAsync();
        var ended = await writer.FinishPresentationAsync(round.Id, new(version), seed.UserId);
        Assert.Equal(TransitionGameRoundOutcome.Transitioned, ended.Outcome);
        Assert.Equal(GameRoundStatusValue.Completed, ended.Round!.Status);
        Assert.Equal(300, ended.Round.FinalScore);
        Assert.Equal(finishedAt, ended.Round.FinishedAtUtc);
        Assert.Null(await writer.GetActiveAsync());
        Assert.Null((await reader.ReadAsync(default)).Summary);
        Assert.Equal(markTeamPlayed, await observer.GameTeams.Where(row => row.Id == seed.TeamId).Select(row => row.IsPlayed).SingleAsync());
        Assert.Equal(markTeamPlayed ? (Guid?)null : seed.TeamId,
            await observer.Games.Where(row => row.Id == seed.GameId).Select(row => row.ActiveTeamId).SingleAsync());
        var repeated = await writer.FinishPresentationAsync(round.Id, new(version), seed.UserId);
        Assert.Equal(TransitionGameRoundOutcome.Transitioned, repeated.Outcome);
        Assert.Equal(ended.Round.RoundVersion, repeated.Round!.RoundVersion);
        Assert.Equal(1, await observer.GameRoundTransitionAudits.CountAsync(row => row.RoundId == round.Id
            && row.ActionCode == GameRoundTransitionActionValue.FinishPresentation));

    }

    [Theory]
    [InlineData(GameRoundStatusValue.AwaitingModifiers)]
    [InlineData(GameRoundStatusValue.Completed)]
    [InlineData(GameRoundStatusValue.Cancelled)]
    public async Task GameOverlay_ReadsFrozenRoundMedia_WithPostgresProjection(string status)
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(db, async (context, _, _, _) =>
        {
            var board = await context.GameBoards.SingleAsync();
            board.Cols = 3;
            board.ColLabels = ["1", "2", "3"];
            board.RowLabels = ["Opening"];
            var hiddenCell = new BoardCell
            {
                Id = Guid.NewGuid(),
                BoardId = board.Id,
                RowIndex = 0,
                ColIndex = 2,
                Cost = 100,
                Title = "Hidden title"
            };
            context.Add(hiddenCell);
            context.Add(new BoardCellMedia
            {
                Id = Guid.NewGuid(),
                Cell = hiddenCell,
                MediaAsset = new MediaAsset { Id = Guid.NewGuid(), Bucket = "cards", ObjectKey = "hidden.webp", MimeType = "image/webp", SizeBytes = 10 }
            });
            await context.SaveChangesAsync();
        });
        var game = await db.Games.FindAsync(seeded.GameId) ?? throw new InvalidOperationException();
        game.ActiveTeamId = seeded.TeamId;
        var finalized = status != GameRoundStatusValue.AwaitingModifiers;
        var technicalCancel = status == GameRoundStatusValue.Cancelled;
        var openedCell = await db.BoardCells.FindAsync(seeded.CellId) ?? throw new InvalidOperationException();
        openedCell.State = BoardCellState.Open;
        var round = new GameRound
        {
            Id = Guid.NewGuid(),
            GameId = seeded.GameId,
            BoardId = seeded.BoardId,
            BoardCellId = seeded.CellId,
            TeamId = seeded.TeamId,
            Status = status,
            PreparedAtUtc = finalized && !technicalCancel ? seeded.Now : null,
            GameplayStartedAtUtc = finalized && !technicalCancel ? seeded.Now : null,
            ReviewedAtUtc = finalized && !technicalCancel ? seeded.Now : null,
            ResolvedByUserId = finalized ? seeded.UserId : null,
            TechnicalCancellationReasonCode = technicalCancel ? "operator_error" : null,
            InternalCancellationDetail = technicalCancel ? "Test cancellation" : null,
            FinishedAtUtc = finalized ? seeded.Now : null,
            FinalScore = finalized ? (technicalCancel ? 0 : 200) : null,
            KillsCount = finalized && !technicalCancel ? 2 : 0,
            TeamSlotIndexSnapshot = 1,
            CellTitleSnapshot = "Test cell",
            CellCostSnapshot = 100,
            BaseScore = 100,
            CreatedAtUtc = seeded.Now,
            UpdatedAtUtc = seeded.Now,
        };
        db.AddRange(round, new GameOverlayKey { OwnerId = seeded.UserId, KeyHash = new string('a', 64) },
            new GameRoundCellMedia
            {
                Id = Guid.NewGuid(),
                RoundId = round.Id,
                Bucket = "cards",
                ObjectKey = "frozen.webp",
                MimeType = "image/webp",
                Role = "image",
                SizeBytes = 10,
                CreatedAtUtc = seeded.Now
            });
        await db.SaveChangesAsync();
        if (technicalCancel)
        {
            openedCell.State = BoardCellState.Cancelled;
            await db.SaveChangesAsync();
        }
        var repository = new DbGameOverlayRepository(db, Options.Create(new StorageOptions { PublicBaseUrl = "https://media.example.test" }), TimeProvider.System, OverlayProtection);
        var snapshot = await repository.ReadAsync(default);
        if (!finalized)
        {
            Assert.Equal(GameRoundStatusValue.AwaitingModifiers, snapshot?.Phase);
            Assert.Null(snapshot!.Board);
            Assert.NotEmpty(snapshot.Team!.Players);
            Assert.Equal("Test cell", snapshot.Round!.Title);
            Assert.Equal("1", snapshot.Round.ColumnLabel);
            Assert.Equal("Opening", snapshot.Round.RowLabel);
            Assert.Equal("https://media.example.test/cards/frozen.webp", snapshot.Round.ImageUrl);
            Assert.Empty(snapshot.Round.Modifiers);
            return;
        }
        Assert.Null(snapshot.Summary);
        var selecting = await repository.ReadAsync(default);
        Assert.Equal("select_card", selecting!.Phase);
        var opened = Assert.Single(selecting.Board!.Cells, cell => cell.Col == 0);
        Assert.Equal(technicalCancel ? "cancelled" : "open", opened.State);
        Assert.Equal("Test cell", opened.Title);
        Assert.Equal("https://media.example.test/cards/frozen.webp", opened.ImageUrl);
        Assert.Equal(technicalCancel ? 0 : 200, opened.Result!.FinalScore);
        Assert.Equal(0, opened.Result.PenaltyTotal);
        Assert.Equal(1, opened.Result.TeamSlotIndex);
        var closed = Assert.Single(selecting.Board.Cells, cell => cell.State == "closed");
        Assert.Null(closed.Title);
        Assert.Null(closed.ImageUrl);
        Assert.Null(closed.Result);

    }
}
