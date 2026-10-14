using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using backend.Domain.GameModifiers;
using backend.Application.Contracts;
using GameModifierActivation = backend.Data.Entities.GameModifierActivation;
using Microsoft.EntityFrameworkCore;
using Backend.Tests.Support;

namespace Backend.Tests.Unit.Infrastructure.Persistence;

public sealed class DbGameOverlayRepositoryTests
{
    [Fact]
    public async Task Summary_PublishesPartialAndCompleteDraftsWithoutChangingRound_ThenUsesSavedResults()
    {
        await using var db = CreateContext();
        var owner = new User { Id = Guid.NewGuid(), DisplayName = "Owner" };
        var game = new Game { Id = Guid.NewGuid(), Status = GameStatusValue.Active };
        var board = new GameBoard { Id = Guid.NewGuid(), GameId = game.Id, ColLabels = ["Hunt"], RowLabels = ["100"] };
        var team = new GameTeam
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            Name = "Hunters",
            Slot = new GameTeamSlot { Id = Guid.NewGuid(), GameId = game.Id, SlotIndex = 1 }
        };
        var cell = new BoardCell { Id = Guid.NewGuid(), BoardId = board.Id, Cost = 100 };
        game.ActiveTeamId = team.Id;
        var round = new GameRound
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            BoardId = board.Id,
            BoardCellId = cell.Id,
            Team = team,
            BaseScore = 100,
            CellCostSnapshot = 100,
            Status = GameRoundStatusValue.ReviewingResults,
            TeamSlotIndexSnapshot = 1,
            Version = 5
        };
        db.AddRange(owner, game, board, cell, team, round, new GameOverlayKey { Owner = owner, KeyHash = "hash" },
            new GameRoundParticipant { Id = Guid.NewGuid(), Round = round, User = owner, DisplayNameSnapshot = "Frozen Hunter" });
        await db.SaveChangesAsync();
        var clock = new MutableTimeProvider(DateTimeOffset.UtcNow);
        var writer = new DbGameRoundRepository(db, clock);
        var reader = new DbGameOverlayRepository(db, Microsoft.Extensions.Options.Options.Create(
            new backend.Infrastructure.Configuration.StorageOptions { PublicBaseUrl = "https://media.example.test" }), clock);
        var partial = new BroadcastGameRoundSummaryInput(5, 3, 1, null);
        Assert.Equal(FinalizeGameRoundOutcome.Completed, (await writer.BroadcastSummaryAsync(round.Id, partial, owner.Id)).Outcome);
        var summary = (await reader.ReadAsync(default))!.Summary!;
        Assert.False(summary.IsFinal);
        Assert.Equal(400, summary.ScoreDetails!.FinalScore);
        Assert.Equal(300, summary.KillsScore);
        Assert.Equal(100, summary.BountyScore);
        Assert.Equal(0, round.KillsCount);
        Assert.Equal(5, round.Version);
        var complete = new FinalizeGameRoundInput("completed", 3, 1, "Private note", [], [], 5);
        Assert.NotNull((await writer.BroadcastSummaryAsync(round.Id, partial with { CompleteInput = complete }, owner.Id)).ScoreDetails);
        Assert.Equal(400, (await reader.ReadAsync(default))!.Summary!.ScoreDetails!.FinalScore);
        Assert.Null(round.FinalScore);
        Assert.Null(round.Notes);
        await writer.BroadcastSummaryAsync(round.Id, partial with { KillsCount = 4 }, owner.Id);
        Assert.Equal(500, (await reader.ReadAsync(default))!.Summary!.ScoreDetails!.FinalScore);
        Assert.Equal(FinalizeGameRoundOutcome.StaleVersion,
            (await writer.BroadcastSummaryAsync(round.Id, partial with { ExpectedRoundVersion = 4 }, owner.Id)).Outcome);
        Assert.Equal(FinalizeGameRoundOutcome.InvalidStatus,
            (await writer.BroadcastSummaryAsync(round.Id, partial with { CompleteInput = complete with { Status = "cancelled" } }, owner.Id)).Outcome);
        Assert.Equal(FinalizeGameRoundOutcome.InvalidModifierResults,
            (await writer.BroadcastSummaryAsync(round.Id, partial with { CompleteInput = complete, PartialInput = complete }, owner.Id)).Outcome);
        await writer.FinalizeAsync(round.Id, complete, owner.Id);
        var final = (await reader.ReadAsync(default))!;
        Assert.Equal("showing_results", final.Phase);
        Assert.True(final.Summary!.IsFinal);
        Assert.Equal(400, final.Summary.ScoreDetails!.FinalScore);
        Assert.Equal(["Frozen Hunter"], final.Team!.Players);
        Assert.Equal(FinalizeGameRoundOutcome.NotInProgress, (await writer.BroadcastSummaryAsync(round.Id, partial, owner.Id)).Outcome);
        clock.UtcNow = clock.UtcNow.AddDays(1);
        Assert.Equal(final.Summary.RoundId, (await reader.ReadAsync(default)).Summary!.RoundId);
        Assert.Equal(TransitionGameRoundOutcome.Transitioned,
            (await writer.FinishPresentationAsync(round.Id, new(round.Version), owner.Id)).Outcome);
        Assert.Null((await reader.ReadAsync(default)).Summary);
        Assert.Equal(GameRoundStatusValue.Completed, round.Status);
        Assert.Equal(400, round.FinalScore);

    }

    [Fact]
    public async Task Summary_InitializesScoringModifiersAtZero_ThenCalculatesOnlyEnteredConditions()
    {
        await using var db = CreateContext();
        var owner = new User { Id = Guid.NewGuid() };
        var game = new Game { Id = Guid.NewGuid(), Status = GameStatusValue.Active };
        var board = new GameBoard { Id = Guid.NewGuid(), GameId = game.Id, ColLabels = ["Hunt"], RowLabels = ["100"] };
        var team = new GameTeam { Id = Guid.NewGuid(), GameId = game.Id, Slot = new GameTeamSlot { Id = Guid.NewGuid(), GameId = game.Id, SlotIndex = 1 } };
        var round = new GameRound
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            BoardId = board.Id,
            Team = team,
            BaseScore = 100,
            CellCostSnapshot = 100,
            Status = GameRoundStatusValue.ReviewingResults
        };
        game.ActiveTeamId = team.Id;
        var rows = new[] { BuiltInModifierBehaviorCatalog.Shot, BuiltInModifierBehaviorCatalog.Hard75, BuiltInModifierBehaviorCatalog.Zhazhda, BuiltInModifierBehaviorCatalog.Prokaznik }
            .Select(code => new GameRoundModifierResult
            {
                Id = Guid.NewGuid(),
                Round = round,
                ModifierId = Guid.NewGuid(),
                ModifierNameSnapshot = code,
                GameModifierActivationId = Guid.NewGuid(),
                DefinitionRevisionSnapshot = 1,
                ResolutionKind = code == BuiltInModifierBehaviorCatalog.Prokaznik ? "ruleStatus" : code == BuiltInModifierBehaviorCatalog.Zhazhda ? "automaticRoundMetric" : "nonNegativeCount",
                ModifierBehaviorV2SnapshotJson = ModifierBehaviorV2Json.Serialize(BuiltInModifierBehaviorCatalog.Get(code))
            }).ToArray();
        db.AddRange(owner, game, board, team, round, new GameOverlayKey { Owner = owner, KeyHash = "hash" });
        db.AddRange(rows);
        await db.SaveChangesAsync();
        var reader = new DbGameOverlayRepository(db, Microsoft.Extensions.Options.Options.Create(
            new backend.Infrastructure.Configuration.StorageOptions { PublicBaseUrl = "https://media.example.test" }), TimeProvider.System);
        var initial = (await reader.ReadAsync(default))!.Summary!.ScoreDetails!;
        Assert.Equal(0, initial.FinalScore);
        Assert.Equal(3, initial.CalculationLines.Count(line => line.ModifierId is not null));
        Assert.DoesNotContain(initial.CalculationLines, line => line.ModifierId == rows[3].ModifierId.ToString());
        Assert.All(initial.CalculationLines, line => Assert.Equal(0, line.PointsDelta));
        var writer = new DbGameRoundRepository(db, TimeProvider.System);
        var partial = new FinalizeGameRoundInput("completed", 3, 0, null,
            [new FinalizeGameRoundModifierInput(rows[0].Id, 1, null)], [], 1);
        var outcome = await writer.BroadcastSummaryAsync(round.Id, new(1, 3, 0, null, partial), owner.Id);
        Assert.Equal(FinalizeGameRoundOutcome.Completed, outcome.Outcome);
        Assert.Null(outcome.ScoreDetails);
        var score = (await reader.ReadAsync(default))!.Summary!.ScoreDetails!;
        Assert.Equal(445, score.FinalScore);
        Assert.DoesNotContain(score.CalculationLines, line => line.ModifierId == rows[3].ModifierId.ToString());
        Assert.Equal(100, Assert.Single(score.CalculationLines, line => line.ModifierId == rows[0].ModifierId.ToString()).PointsDelta);
        Assert.Equal(0, Assert.Single(score.CalculationLines, line => line.ModifierId == rows[1].ModifierId.ToString()).PointsDelta);
        Assert.Equal(45, Assert.Single(score.CalculationLines, line => line.ModifierId == rows[2].ModifierId.ToString()).PointsDelta);
        Assert.All(await db.GameRoundModifierResults.AsNoTracking().ToArrayAsync(), row => Assert.Equal(0, row.ScoreDelta));
        Assert.Null(round.FinalScore);
    }

    [Fact]
    public async Task Snapshot_OnlyExposesActiveRosterAndVisibleCards_ThenHidesBoardAfterOpening()
    {
        await using var db = CreateContext();
        var owner = new User { Id = Guid.NewGuid(), DisplayName = "Owner" };
        var game = new Game { Id = Guid.NewGuid(), Title = "Live", Status = GameStatusValue.Active };
        var slot = new GameTeamSlot { Id = Guid.NewGuid(), GameId = game.Id, SlotIndex = 1 };
        var team = new GameTeam { Id = Guid.NewGuid(), GameId = game.Id, Slot = slot, Name = "Hunters" };
        game.ActiveTeamId = team.Id;
        var board = new GameBoard { Id = Guid.NewGuid(), GameId = game.Id, RowLabels = ["100"], ColLabels = ["Category"] };
        var cell = new BoardCell { Id = Guid.NewGuid(), BoardId = board.Id, Title = "Secret", Description = "Private", Cost = 100 };
        db.AddRange(owner, game, team, board, cell,
            new GameOverlayKey { Owner = owner, KeyHash = "hash" },
            new GameTeamMember { Id = Guid.NewGuid(), GameId = game.Id, Team = team, User = owner },
            new GameTeamMember { Id = Guid.NewGuid(), GameId = game.Id, Team = team, User = owner, LeftAtUtc = DateTime.UtcNow });
        await db.SaveChangesAsync();
        var repository = new DbGameOverlayRepository(db, Microsoft.Extensions.Options.Options.Create(new backend.Infrastructure.Configuration.StorageOptions { PublicBaseUrl = "https://media.example.test" }), TimeProvider.System);

        var selecting = await repository.ReadAsync(CancellationToken.None);
        Assert.NotNull(selecting);
        Assert.Equal("select_card", selecting.Phase);
        Assert.Equal("Hunters", selecting.Team?.Name);
        Assert.Equal(["Owner"], selecting.Team!.Players);
        Assert.Null(Assert.Single(selecting.Board!.Cells).Title);
        Assert.False(await repository.ValidateKeyAsync("wrong", CancellationToken.None));

        var round = new GameRound
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            TeamId = team.Id,
            BoardId = board.Id,
            Status = GameRoundStatusValue.CardOpened,
            CellTitleSnapshot = "Original card",
            CellCostSnapshot = 300
        };
        db.GameRounds.Add(round);
        db.Add(new GameRoundCellMedia { Id = Guid.NewGuid(), RoundId = round.Id, Bucket = "cards", ObjectKey = "original.webp", MimeType = "image/webp" });
        var activation = new GameModifierActivation
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            RoundId = round.Id,
            ModifierNameSnapshot = "Original modifier",
            ModifierId = Guid.NewGuid(),
            ModifierIconEmojiSnapshot = "X",
            ActivatedByUser = owner
        };
        db.AddRange(activation,
            new GameModifierActivation { Id = Guid.NewGuid(), GameId = game.Id, RoundId = round.Id, Status = GameModifierActivationStatusValue.Cancelled },
            new GameModifierActivation { Id = Guid.NewGuid(), GameId = game.Id, RoundId = Guid.NewGuid() },
            new GameModifierActivation { Id = Guid.NewGuid(), GameId = game.Id, RoundId = round.Id, ArchivedAtUtc = DateTime.UtcNow });
        await db.SaveChangesAsync();
        var opened = await repository.ReadAsync(CancellationToken.None);
        Assert.Equal("card_opened", opened?.Phase);
        Assert.Null(opened?.Board);
        Assert.NotNull(opened?.Team);
        Assert.Equal("Original card", opened!.Round!.Title);
        Assert.Equal(300, opened.Round.Cost);
        Assert.Equal("Category", opened.Round.ColumnLabel);
        Assert.Equal("100", opened.Round.RowLabel);
        Assert.Equal("https://media.example.test/cards/original.webp", opened.Round.ImageUrl);
        Assert.Equal("Original modifier", Assert.Single(opened.Round.Modifiers).Name);
        Assert.Equal(activation.ModifierId.ToString(), opened.Round.Modifiers[0].ModifierId);

        round.Status = GameRoundStatusValue.AwaitingModifiers;
        activation.Status = GameModifierActivationStatusValue.Cancelled;
        await db.SaveChangesAsync();
        var cancelled = await repository.ReadAsync(default);
        Assert.Empty(cancelled!.Round!.Modifiers);
        activation.Status = GameModifierActivationStatusValue.Active;
        await db.SaveChangesAsync();
        var ordering = await repository.ReadAsync(default);
        round.Status = GameRoundStatusValue.Preparing;
        await db.SaveChangesAsync();
        var preparing = await repository.ReadAsync(default);
        Assert.Equal("preparing", preparing!.Phase);
        Assert.Null(preparing.Board);
        Assert.Equal(ordering!.Round!.Id, preparing.Round!.Id);
        Assert.Equal(ordering.Round.Title, preparing.Round.Title);
        Assert.Equal(ordering.Round.Cost, preparing.Round.Cost);
        Assert.Equal(ordering.Round.ColumnLabel, preparing.Round.ColumnLabel);
        Assert.Equal(ordering.Round.RowLabel, preparing.Round.RowLabel);
        Assert.Equal(ordering.Round.ImageUrl, preparing.Round.ImageUrl);
        Assert.Equal(ordering.Round.Modifiers, preparing.Round.Modifiers);
        round.Status = GameRoundStatusValue.InProgress;
        round.GameplayStartedAtUtc = DateTime.UtcNow.AddSeconds(-30);
        var runtimeGroup = Guid.NewGuid();
        var aggregateBehavior = BuiltInModifierBehaviorCatalog.Get(BuiltInModifierBehaviorCatalog.Chirik);
        var independentBehavior = aggregateBehavior with { StackingPolicy = ModifierStackingPolicy.IndependentInstances, DurationSecondsPerActivation = 300 };
        foreach (var behavior in new[] { aggregateBehavior, aggregateBehavior, independentBehavior })
        {
            db.GameRoundModifierResults.Add(new GameRoundModifierResult
            {
                Id = Guid.NewGuid(),
                Round = round,
                ModifierId = activation.ModifierId,
                GameModifierActivation = activation,
                ModifierNameSnapshot = "Frozen modifier",
                ResolutionGroupId = behavior == independentBehavior ? null : runtimeGroup,
                ModifierBehaviorV2SnapshotJson = ModifierBehaviorV2Json.Serialize(behavior)
            });
        }
        activation.Status = GameModifierActivationStatusValue.Cancelled;
        await db.SaveChangesAsync();
        var beforeRead = DateTime.UtcNow;
        var playing = await repository.ReadAsync(default);
        Assert.Null(playing!.Round);
        Assert.Null(playing.Board);
        Assert.Equal(round.GameplayStartedAtUtc, playing.Gameplay!.GameplayStartedAtUtc);
        Assert.InRange(playing.Gameplay.ServerNowUtc, beforeRead, DateTime.UtcNow);
        var playingModifier = Assert.Single(playing.Gameplay.Modifiers);
        Assert.Equal("Frozen modifier", playingModifier.Name);
        Assert.Equal("X", playingModifier.IconEmoji);
        Assert.Equal(3, playingModifier.ActivationCount);
        Assert.Equal(new long[] { 120, 300 }, playingModifier.Timers.Select(timer => timer.DurationSeconds).Order());
        round.Status = GameRoundStatusValue.ReviewingResults;
        await db.SaveChangesAsync();
        Assert.Null((await repository.ReadAsync(default))!.Gameplay);

        owner.IsActive = false;
        await db.SaveChangesAsync();
        Assert.False(await repository.ValidateKeyAsync("hash", CancellationToken.None));
    }

    [Fact]
    public async Task Snapshot_NoActiveGame_IsTransparent_AndRevokedKeyIsRejected()
    {
        await using var db = CreateContext();
        var key = new GameOverlayKey { Owner = new User { Id = Guid.NewGuid() }, KeyHash = "hash" };
        db.Add(key);
        await db.SaveChangesAsync();
        var repository = new DbGameOverlayRepository(db, Microsoft.Extensions.Options.Options.Create(new backend.Infrastructure.Configuration.StorageOptions { PublicBaseUrl = "https://media.example.test" }), TimeProvider.System);
        var snapshot = await repository.ReadAsync(CancellationToken.None);
        Assert.Equal("idle", snapshot?.Phase);
        Assert.Null(snapshot?.Team);
        Assert.Null(snapshot?.Board);
        db.Remove(key);
        await db.SaveChangesAsync();
        Assert.False(await repository.ValidateKeyAsync("hash", CancellationToken.None));
    }

    private static ApplicationDbContext CreateContext() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"overlay-{Guid.NewGuid():N}").Options);
}
