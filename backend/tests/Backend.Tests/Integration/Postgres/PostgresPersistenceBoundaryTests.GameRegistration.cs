using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using backend.Infrastructure.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Fact]
    public async Task DisbandMigration_UpgradesAnExistingActiveGameWithoutLosingItsRoster()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        await db.GetService<IMigrator>().MigrateAsync("20260908003848_ProductionBaseline");
        try
        {
            var seeded = await SeedPlayableRoundGraphAsync(db);
            var memberCount = await db.GameTeamMembers.CountAsync();
            await db.Database.MigrateAsync();
            Assert.Equal(memberCount, await db.GameTeamMembers.CountAsync());
            var repository = new DbGameRegistrationPersistence(
                db, new GameRegistrationReadStore(db),
                NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System
            );
            Assert.True((await repository.PersistDisbandTeamAsync(seeded.GameId, seeded.UserId, seeded.TeamId)).Success);
            Assert.Equal(memberCount, await db.GameTeamMembers.CountAsync(member => member.LeftAtUtc != null));
        }
        finally
        {
            await db.Database.MigrateAsync();
        }
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DisbandAndSelectActiveTeam_WhenConcurrent_OnlyOneOperationSucceeds(bool disbandFirst)
    {
        await _database.ResetAsync();
        await using var seedDb = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(seedDb);
        var firstLock = new RosterLockInterceptor(holdLock: true);
        var secondLock = new RosterLockInterceptor(holdLock: false);
        await using var disbandDb = _database.CreateDbContext(disbandFirst ? firstLock : secondLock);
        await using var selectDb = _database.CreateDbContext(disbandFirst ? secondLock : firstLock);
        var registration = new DbGameRegistrationPersistence(
            disbandDb, new GameRegistrationReadStore(disbandDb),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System
        );
        var board = new DbGameBoardRepository(
            selectDb, Options.Create(new StorageOptions { PublicBaseUrl = "https://storage.test" }),
            NullLogger<DbGameBoardRepository>.Instance, TimeProvider.System
        );
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        Task<GameRegistrationResult<bool>>? disbandTask = null;
        Task<SetActiveGameTeamOutcome>? selectTask = null;
        try
        {
            if (disbandFirst)
                disbandTask = registration.PersistDisbandTeamAsync(seeded.GameId, seeded.UserId, seeded.TeamId, timeout.Token);
            else
                selectTask = board.SetActiveTeamAsync(seeded.TeamId, timeout.Token);

            await firstLock.Acquired.Task.WaitAsync(timeout.Token);
            if (disbandFirst)
                selectTask = board.SetActiveTeamAsync(seeded.TeamId, timeout.Token);
            else
                disbandTask = registration.PersistDisbandTeamAsync(seeded.GameId, seeded.UserId, seeded.TeamId, timeout.Token);

            await secondLock.Attempted.Task.WaitAsync(timeout.Token);
        }
        finally
        {
            firstLock.Continue.TrySetResult();
        }
        var disbandResult = await disbandTask!;
        var selectResult = await selectTask!;
        Assert.Equal(disbandFirst, disbandResult.Success);

        await using var verifyDb = _database.CreateDbContext();
        var game = await verifyDb.Games.SingleAsync();
        var team = await verifyDb.GameTeams.SingleAsync();
        if (disbandResult.Success)
        {
            Assert.Equal(SetActiveGameTeamOutcome.TeamNotConfirmed, selectResult);
            Assert.Null(game.ActiveTeamId);
            Assert.Equal(TeamStatusValue.Disbanded, team.Status);
        }
        else
        {
            Assert.Equal(GameRegistrationErrorCode.TeamActiveInGame, disbandResult.Error);
            Assert.Equal(SetActiveGameTeamOutcome.Updated, selectResult);
            Assert.Equal(team.Id, game.ActiveTeamId);
            Assert.Equal(TeamStatusValue.Confirmed, team.Status);
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ActiveRoster_DatabaseStillRejectsDisbandingAnActiveOrPlayedTeam(bool played)
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(db);
        var game = await db.Games.SingleAsync();
        var team = await db.GameTeams.SingleAsync();
        if (played)
        {
            team.IsPlayed = true;
            team.PlayedAtUtc = DateTime.UtcNow;
        }
        else
        {
            game.ActiveTeamId = team.Id;
        }
        await db.SaveChangesAsync();
        team.Status = TeamStatusValue.Disbanded;
        team.RecruitmentOpen = false;
        team.DisbandedAtUtc = DateTime.UtcNow;
        team.DisbandedByUserId = seeded.UserId;
        var exception = await Record.ExceptionAsync(() => db.SaveChangesAsync());
        Assert.NotNull(exception);
        Assert.Equal("55000", Assert.IsType<PostgresException>(exception.GetBaseException()).SqlState);
    }

    [Fact]
    public async Task ActiveRoster_DisbandWithoutClosingMemberships_RollsBack()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(db);
        var team = await db.GameTeams.SingleAsync();
        team.Status = TeamStatusValue.Disbanded;
        team.RecruitmentOpen = false;
        team.DisbandedAtUtc = DateTime.UtcNow;
        team.DisbandedByUserId = seeded.UserId;
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        AssertPostgresConstraint(exception, "ck_games_active_roster_confirmed_members");
        await using var verifyDb = _database.CreateDbContext();
        Assert.Equal(TeamStatusValue.Confirmed, (await verifyDb.GameTeams.SingleAsync()).Status);
        Assert.All(await verifyDb.GameTeamMembers.ToListAsync(), member => Assert.Null(member.LeftAtUtc));
    }

    [Theory]
    [InlineData("eligible")]
    [InlineData("active")]
    [InlineData("played")]
    [InlineData("completed")]
    [InlineData("cancelled")]
    public async Task DisbandDuringActiveGame_OnlyAllowsUnplayedInactiveTeam(string state)
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(db);
        var game = await db.Games.SingleAsync();
        var team = await db.GameTeams.SingleAsync();
        if (state == "active")
        {
            game.ActiveTeamId = team.Id;
        }
        if (state == "played")
        {
            team.IsPlayed = true;
            team.PlayedAtUtc = DateTime.UtcNow;
            team.UpdatedAtUtc = team.PlayedAtUtc.Value;
        }
        if (state is "completed" or "cancelled")
        {
            db.GameRounds.Add(new GameRound
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                BoardId = seeded.BoardId,
                BoardCellId = seeded.CellId,
                TeamId = team.Id,
                Status = state == "cancelled" ? GameRoundStatusValue.Cancelled : GameRoundStatusValue.Completed,
                BaseScore = 100,
                FinalScore = state == "cancelled" ? 0 : 100,
                TechnicalCancellationReasonCode = state == "cancelled" ? "operator_error" : null,
                InternalCancellationDetail = state == "cancelled" ? "Registration boundary fixture" : null,
                ResolvedByUserId = seeded.UserId,
                TeamSlotIndexSnapshot = 1,
                CellRowIndex = 0,
                CellColIndex = 0,
                CellTitleSnapshot = "Test cell",
                CellCostSnapshot = 100,
                CreatedAtUtc = seeded.Now,
                UpdatedAtUtc = seeded.Now,
                PreparedAtUtc = seeded.Now,
                GameplayStartedAtUtc = seeded.Now,
                ReviewedAtUtc = seeded.Now,
                FinishedAtUtc = seeded.Now
            });
        }
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var repository = new DbGameRegistrationPersistence(
            db, new GameRegistrationReadStore(db),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System
        );
        var result = await repository.PersistDisbandTeamAsync(seeded.GameId, seeded.UserId, seeded.TeamId);

        await using var verifyDb = _database.CreateDbContext();
        var persistedTeam = await verifyDb.GameTeams.SingleAsync();
        var members = await verifyDb.GameTeamMembers.ToListAsync();
        Assert.NotEmpty(members);
        if (state == "eligible")
        {
            Assert.True(result.Success);
            Assert.Equal(TeamStatusValue.Disbanded, persistedTeam.Status);
            Assert.All(members, member => Assert.NotNull(member.LeftAtUtc));
            Assert.Empty(await verifyDb.GameTeams.Where(candidate => candidate.Status == TeamStatusValue.Confirmed).ToListAsync());
        }
        else
        {
            Assert.False(result.Success);
            Assert.Equal(state == "active" ? GameRegistrationErrorCode.TeamActiveInGame : GameRegistrationErrorCode.TeamAlreadyPlayed, result.Error);
            Assert.Equal(TeamStatusValue.Confirmed, persistedTeam.Status);
            Assert.All(members, member => Assert.Null(member.LeftAtUtc));
        }
        Assert.Equal(GameStatusValue.Active, (await verifyDb.Games.SingleAsync()).Status);
    }

    [Theory]
    [InlineData("remove")]
    [InlineData("leave")]
    [InlineData("assign-from")]
    [InlineData("assign-to")]
    public async Task ConfirmedRoster_RejectsIndividualChangesWithoutClosingMemberships(string operation)
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var now = DateTime.UtcNow;
        var admin = CreateUser("locked-admin");
        var player = CreateUser("locked-player");
        var game = CreateGame(GameStatusValue.Draft, now);
        var slot = CreateSlot(game.Id, 1, now);
        var team = CreateTeam(game.Id, slot.Id, now, TeamStatusValue.Confirmed);
        team.ConfirmedAtUtc = now;
        team.ConfirmedByUserId = admin.Id;
        var otherSlot = CreateSlot(game.Id, 2, now);
        var otherTeam = CreateTeam(game.Id, otherSlot.Id, now, TeamStatusValue.Forming);
        var member = new GameTeamMember
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            TeamId = team.Id,
            UserId = player.Id,
            JoinedAtUtc = now
        };
        AddDraftBoard(db, game.Id, now);
        db.AddRange(game, admin, player, slot, team, otherSlot, otherTeam, member);
        await db.SaveChangesAsync();
        game.Status = GameStatusValue.Ready;
        game.ReadyAtUtc = now;
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var repository = new DbGameRegistrationPersistence(
            db, new GameRegistrationReadStore(db),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System
        );
        if (operation is "remove" or "leave")
        {
            var result = operation == "leave"
                ? await repository.PersistLeaveTeamAsync(game.Id, player.Id)
                : await repository.PersistRemovePlayerFromTeamAsync(game.Id, admin.Id, team.Id, player.Id);
            Assert.Equal(GameRegistrationErrorCode.TeamRosterLocked, result.Error);
            Assert.False(result.Success);
        }
        else
        {
            var result = await repository.PersistAssignPlayerAsync(
                game.Id, admin.Id, operation == "assign-from" ? otherTeam.Id : team.Id,
                operation == "assign-from" ? player.Id : admin.Id, 2
            );
            Assert.Equal(GameRegistrationErrorCode.TeamRosterLocked, result.Error);
            Assert.False(result.Success);
        }
        await using var verifyDb = _database.CreateDbContext();
        var preservedMember = await verifyDb.GameTeamMembers.SingleAsync();
        Assert.Equal(team.Id, preservedMember.TeamId);
        Assert.Null(preservedMember.LeftAtUtc);
        Assert.Equal(TeamStatusValue.Confirmed, (await verifyDb.GameTeams.SingleAsync(candidate => candidate.Id == team.Id)).Status);
    }

    [Theory]
    [InlineData("disband", true, false)]
    [InlineData("disband", true, true)]
    [InlineData("disband", false, true)]
    [InlineData("disband-forming", true, false)]
    [InlineData("disband-empty", true, false)]
    [InlineData("remove", true, false)]
    [InlineData("reject", true, false)]
    [InlineData("leave", true, false)]
    [InlineData("assign", true, false)]
    public async Task CloseRegistrationTeam_PersistsTerminalStateAndMembershipHistory(
        string operation,
        bool recruitmentOpen,
        bool disbandRequested
    )
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var now = DateTime.UtcNow;
        var admin = CreateUser("registration-admin");
        var player = CreateUser("registration-player");
        var invitee = CreateUser("registration-invitee");
        var game = CreateGame(GameStatusValue.Draft, now);
        var slot = CreateSlot(game.Id, 1, now);
        var status = operation == "disband" || disbandRequested
            ? TeamStatusValue.Confirmed
            : TeamStatusValue.Forming;
        var team = CreateTeam(game.Id, slot.Id, now, status, recruitmentOpen);
        if (status == TeamStatusValue.Confirmed)
        {
            team.ConfirmedAtUtc = now;
            team.ConfirmedByUserId = admin.Id;
        }
        if (disbandRequested)
        {
            team.DisbandRequestedAtUtc = now;
            team.DisbandRequestedByUserId = player.Id;
        }

        var membership = new GameTeamMember
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            TeamId = team.Id,
            UserId = player.Id,
            JoinedAtUtc = now
        };
        var invitation = new GameTeamInvitation
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            TeamId = team.Id,
            SlotId = slot.Id,
            InvitedUserId = invitee.Id,
            InvitedByUserId = admin.Id,
            InvitedByKind = InvitedByKindValue.Admin,
            Status = TeamInvitationStatusValue.Pending,
            CreatedAtUtc = now
        };
        var targetSlot = CreateSlot(game.Id, 2, now);
        var targetTeam = CreateTeam(game.Id, targetSlot.Id, now, TeamStatusValue.Forming);
        AddDraftBoard(db, game.Id, now);
        db.AddRange(admin, player, invitee, game, slot, team, targetSlot, targetTeam);
        if (operation != "disband-empty")
        {
            db.Add(membership);
        }
        if (operation != "leave")
        {
            db.Add(invitation);
        }
        await db.SaveChangesAsync();
        game.Status = GameStatusValue.Ready;
        game.ReadyAtUtc = now;
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var repository = new DbGameRegistrationPersistence(
            db,
            new GameRegistrationReadStore(db),
            NullLogger<DbGameRegistrationPersistence>.Instance,
            TimeProvider.System
        );
        if (operation == "assign")
        {
            var result = await repository.PersistAssignPlayerAsync(game.Id, admin.Id, targetTeam.Id, player.Id, 2);
            Assert.True(result.Success);
        }
        else
        {
            GameRegistrationResult<bool> result = operation switch
            {
                "disband" or "disband-forming" or "disband-empty" => await repository.PersistDisbandTeamAsync(game.Id, admin.Id, team.Id),
                "remove" => await repository.PersistRemovePlayerFromTeamAsync(game.Id, admin.Id, team.Id, player.Id),
                "reject" => await repository.PersistRejectTeamAsync(game.Id, admin.Id, team.Id),
                "leave" => await repository.PersistLeaveTeamAsync(game.Id, player.Id),
                _ => throw new ArgumentOutOfRangeException(nameof(operation))
            };
            Assert.True(result.Success);
        }

        await using var verifyDb = _database.CreateDbContext();
        var closedTeam = await verifyDb.GameTeams.SingleAsync(candidate => candidate.Id == team.Id);
        Assert.Equal(operation == "reject" ? TeamStatusValue.Rejected : TeamStatusValue.Disbanded, closedTeam.Status);
        Assert.False(closedTeam.RecruitmentOpen);
        Assert.Null(closedTeam.DisbandRequestedAtUtc);
        Assert.Null(closedTeam.DisbandRequestedByUserId);
        Assert.True(closedTeam.UpdatedAtUtc >= now);
        if (operation == "reject")
        {
            Assert.Equal(admin.Id, closedTeam.RejectedByUserId);
            Assert.NotNull(closedTeam.RejectedAtUtc);
        }
        else
        {
            Assert.Equal(operation == "leave" ? player.Id : admin.Id, closedTeam.DisbandedByUserId);
            Assert.NotNull(closedTeam.DisbandedAtUtc);
        }
        if (operation == "disband")
        {
            Assert.Equal(admin.Id, closedTeam.ConfirmedByUserId);
            Assert.NotNull(closedTeam.ConfirmedAtUtc);
        }

        if (operation != "disband-empty")
        {
            var historicalMember = await verifyDb.GameTeamMembers.SingleAsync(member => member.Id == membership.Id);
            Assert.NotNull(historicalMember.LeftAtUtc);
            Assert.True(historicalMember.LeftAtUtc >= historicalMember.JoinedAtUtc);
        }
        Assert.False(await verifyDb.GameTeamMembers.AnyAsync(member => member.TeamId == team.Id && member.LeftAtUtc == null));
        if (operation != "leave")
        {
            var cancelledInvitation = await verifyDb.GameTeamInvitations.SingleAsync(candidate => candidate.Id == invitation.Id);
            Assert.Equal(TeamInvitationStatusValue.Cancelled, cancelledInvitation.Status);
            Assert.NotNull(cancelledInvitation.RespondedAtUtc);
        }
        if (operation == "assign")
        {
            Assert.True(await verifyDb.GameTeamMembers.AnyAsync(
                member => member.TeamId == targetTeam.Id && member.UserId == player.Id && member.LeftAtUtc == null
            ));
        }

        // A terminal team preserves history while releasing its queue position.
        verifyDb.GameTeams.Add(CreateTeam(game.Id, slot.Id, DateTime.UtcNow, TeamStatusValue.Forming));
        await verifyDb.SaveChangesAsync();
    }
}
