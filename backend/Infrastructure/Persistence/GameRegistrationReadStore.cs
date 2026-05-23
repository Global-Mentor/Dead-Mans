using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

/// <summary>
/// Read-model queries and DTO projection for game registration.
/// </summary>
public sealed class GameRegistrationReadStore : IGameRegistrationReadStore
{
    private readonly ApplicationDbContext _dbContext;

    public GameRegistrationReadStore(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ReadyGameRegistrationContext?> GetReadyGameAsync(CancellationToken cancellationToken) =>
        await _dbContext.Games
            .AsNoTracking()
            .Where(game => game.Status == GameStatusValue.Ready)
            .OrderByDescending(game => game.ReadyAtUtc)
            .Select(
                game => new ReadyGameRegistrationContext(
                    game.Id,
                    game.MinPlayersPerTeam,
                    game.MaxPlayersPerTeam
                )
            )
            .FirstOrDefaultAsync(cancellationToken);

    public Task<bool> UserHasTeamMembershipAsync(
        Guid gameId,
        Guid userId,
        CancellationToken cancellationToken
    ) =>
        (
            from member in _dbContext.GameTeamMembers
            join team in _dbContext.GameTeams on member.TeamId equals team.Id
            where member.GameId == gameId
                && member.UserId == userId
                && member.LeftAtUtc == null
                && (team.Status == TeamStatusValue.Forming || team.Status == TeamStatusValue.Confirmed)
            select member
        ).AnyAsync(cancellationToken);

    public Task<bool> HasPendingInvitationAsync(
        Guid gameId,
        Guid userId,
        CancellationToken cancellationToken
    ) =>
        _dbContext.GameParticipationInvitations.AnyAsync(
            invitation =>
                invitation.GameId == gameId
                && invitation.InvitedUserId == userId
                && invitation.Status == ParticipationInvitationStatusValue.Pending,
            cancellationToken
        );

    public Task<PendingInvitationSnapshot?> GetPendingInvitationAsync(
        Guid userId,
        Guid invitationId,
        CancellationToken cancellationToken
    ) =>
        _dbContext.GameParticipationInvitations
            .AsNoTracking()
            .Where(
                invitation =>
                    invitation.Id == invitationId
                    && invitation.InvitedUserId == userId
                    && invitation.Status == ParticipationInvitationStatusValue.Pending
            )
            .Select(
                invitation => new PendingInvitationSnapshot(
                    invitation.Id,
                    invitation.GameId,
                    invitation.SlotId,
                    invitation.TeamId,
                    invitation.Status,
                    invitation.InvitedUserId
                )
            )
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<AvailableParticipationSlot?> FindAvailablePublicSlotAsync(
        Guid gameId,
        CancellationToken cancellationToken
    )
    {
        var blockedSlotIds = await GetBlockedSlotIdsAsync(gameId, cancellationToken);
        var publicSlots = await _dbContext.GameParticipationSlots
            .AsNoTracking()
            .Where(slot => slot.GameId == gameId && slot.Availability == SlotAvailabilityValue.Public)
            .OrderBy(slot => slot.SlotIndex)
            .ToListAsync(cancellationToken);

        var slot = publicSlots.FirstOrDefault(candidate => !blockedSlotIds.Contains(candidate.Id));
        return slot is null
            ? null
            : new AvailableParticipationSlot(slot.Id, slot.SlotIndex);
    }

    public async Task<HashSet<Guid>> GetBlockedSlotIdsAsync(
        Guid gameId,
        CancellationToken cancellationToken
    )
    {
        var occupyingSlotIds = await _dbContext.GameTeams
            .AsNoTracking()
            .Where(
                team => team.GameId == gameId
                    && (team.Status == TeamStatusValue.Forming || team.Status == TeamStatusValue.Confirmed)
            )
            .Select(team => team.SlotId)
            .ToListAsync(cancellationToken);

        var pendingInviteSlotIds = await _dbContext.GameParticipationInvitations
            .AsNoTracking()
            .Where(
                invitation =>
                    invitation.GameId == gameId
                    && invitation.Status == ParticipationInvitationStatusValue.Pending
            )
            .Select(invitation => invitation.SlotId)
            .ToListAsync(cancellationToken);

        var blocked = new HashSet<Guid>(occupyingSlotIds);
        blocked.UnionWith(pendingInviteSlotIds);
        return blocked;
    }

    public async Task<JoinableTeamSnapshot?> GetJoinableTeamAsync(
        Guid gameId,
        Guid teamId,
        CancellationToken cancellationToken
    )
    {
        var team = await _dbContext.GameTeams
            .AsNoTracking()
            .Where(candidate => candidate.Id == teamId && candidate.GameId == gameId)
            .Select(
                candidate => new JoinableTeamSnapshot(
                    candidate.Id,
                    candidate.Status,
                    candidate.RecruitmentOpen
                )
            )
            .FirstOrDefaultAsync(cancellationToken);

        return team;
    }

    public async Task<TeamAdminActionSnapshot?> GetTeamAdminActionSnapshotAsync(
        Guid gameId,
        Guid teamId,
        CancellationToken cancellationToken
    )
    {
        var team = await _dbContext.GameTeams
            .AsNoTracking()
            .Where(candidate => candidate.Id == teamId && candidate.GameId == gameId)
            .Select(candidate => new { candidate.Status })
            .FirstOrDefaultAsync(cancellationToken);
        if (team is null)
        {
            return null;
        }

        var memberCount = await _dbContext.GameTeamMembers.CountAsync(
            member => member.TeamId == teamId && member.LeftAtUtc == null,
            cancellationToken
        );

        return new TeamAdminActionSnapshot(team.Status, memberCount);
    }

    public async Task<TeamInviteTargetSnapshot?> GetTeamInviteTargetSnapshotAsync(
        Guid gameId,
        Guid teamId,
        CancellationToken cancellationToken
    )
    {
        var team = await _dbContext.GameTeams
            .AsNoTracking()
            .Where(candidate => candidate.Id == teamId && candidate.GameId == gameId)
            .Select(candidate => new { candidate.Id, candidate.SlotId, candidate.Status })
            .FirstOrDefaultAsync(cancellationToken);
        if (team is null)
        {
            return null;
        }

        var memberCount = await _dbContext.GameTeamMembers.CountAsync(
            member => member.TeamId == teamId && member.LeftAtUtc == null,
            cancellationToken
        );

        return new TeamInviteTargetSnapshot(team.Id, team.SlotId, team.Status, memberCount);
    }

    public Task<ParticipationSlotSnapshot?> GetParticipationSlotAsync(
        Guid gameId,
        Guid slotId,
        CancellationToken cancellationToken
    ) =>
        _dbContext.GameParticipationSlots
            .AsNoTracking()
            .Where(slot => slot.Id == slotId && slot.GameId == gameId)
            .Select(slot => new ParticipationSlotSnapshot(slot.Id, slot.SlotIndex))
            .FirstOrDefaultAsync(cancellationToken);

    public Task<bool> ActiveUserExistsAsync(Guid userId, CancellationToken cancellationToken) =>
        _dbContext.Users.AnyAsync(user => user.Id == userId && user.IsActive, cancellationToken);

    public async Task<GameRegistrationSnapshot> BuildSnapshotAsync(
        Guid gameId,
        Guid userId,
        CancellationToken cancellationToken
    )
    {
        var game = await _dbContext.Games
            .AsNoTracking()
            .FirstAsync(x => x.Id == gameId, cancellationToken);

        var slots = await _dbContext.GameParticipationSlots
            .AsNoTracking()
            .Where(slot => slot.GameId == gameId)
            .OrderBy(slot => slot.SlotIndex)
            .ToListAsync(cancellationToken);

        var teams = await _dbContext.GameTeams
            .AsNoTracking()
            .Where(
                team => team.GameId == gameId
                    && (team.Status == TeamStatusValue.Forming || team.Status == TeamStatusValue.Confirmed)
            )
            .ToListAsync(cancellationToken);

        var teamDtos = await LoadTeamsDtoAsync(gameId, cancellationToken);
        var blockedSlotIds = await GetBlockedSlotIdsAsync(gameId, cancellationToken);

        var myTeam = teamDtos.FirstOrDefault(
            team => team.Members.Any(member => member.Player.UserId == userId)
        );

        var slotDtos = new List<RegistrationSlotDto>();
        foreach (var slot in slots)
        {
            var occupyingTeam = teams.FirstOrDefault(
                team => team.SlotId == slot.Id && TeamStatusValue.OccupiesSlot(team.Status)
            );
            var blocked = IGameRegistrationReadStore.IsSlotBlocked(slot.Id, blockedSlotIds);
            slotDtos.Add(
                new RegistrationSlotDto(
                    slot.Id,
                    slot.SlotIndex,
                    slot.Availability,
                    slot.ReservedLabel,
                    slot.Availability == SlotAvailabilityValue.Public
                        && !blocked
                        && occupyingTeam is null,
                    occupyingTeam?.Id,
                    occupyingTeam?.Status
                )
            );
        }

        var myInvites = await _dbContext.GameParticipationInvitations
            .AsNoTracking()
            .Where(
                invitation =>
                    invitation.GameId == gameId
                    && invitation.InvitedUserId == userId
                    && invitation.Status == ParticipationInvitationStatusValue.Pending
            )
            .Join(
                _dbContext.GameParticipationSlots,
                invitation => invitation.SlotId,
                slot => slot.Id,
                (invitation, slot) =>
                    new RegistrationInvitationDto(
                        invitation.Id,
                        slot.Id,
                        slot.SlotIndex,
                        invitation.TeamId,
                        invitation.Status,
                        invitation.CreatedAtUtc
                    )
            )
            .ToListAsync(cancellationToken);

        return new GameRegistrationSnapshot(
            gameId,
            game.Status,
            game.MinPlayersPerTeam,
            game.MaxPlayersPerTeam,
            slotDtos,
            teamDtos,
            myTeam,
            myInvites
        );
    }

    public async Task<RegistrationTeamDto?> LoadTeamDtoAsync(
        Guid teamId,
        CancellationToken cancellationToken
    )
    {
        var gameId = await _dbContext.GameTeams
            .AsNoTracking()
            .Where(team => team.Id == teamId)
            .Select(team => team.GameId)
            .FirstOrDefaultAsync(cancellationToken);
        if (gameId == Guid.Empty)
        {
            return null;
        }

        var teams = await LoadTeamsDtoAsync(gameId, cancellationToken, [teamId]);
        return teams.FirstOrDefault();
    }

    private async Task<IReadOnlyList<RegistrationTeamDto>> LoadTeamsDtoAsync(
        Guid gameId,
        CancellationToken cancellationToken,
        IReadOnlyCollection<Guid>? teamIds = null
    )
    {
        var teamsQuery = _dbContext.GameTeams
            .AsNoTracking()
            .Include(team => team.Slot)
            .Where(
                team => team.GameId == gameId
                    && (team.Status == TeamStatusValue.Forming || team.Status == TeamStatusValue.Confirmed)
            );

        if (teamIds is { Count: > 0 })
        {
            teamsQuery = teamsQuery.Where(team => teamIds.Contains(team.Id));
        }

        var teams = await teamsQuery.ToListAsync(cancellationToken);
        if (teams.Count == 0)
        {
            return Array.Empty<RegistrationTeamDto>();
        }

        var loadedTeamIds = teams.Select(team => team.Id).ToList();
        var membersByTeamId = await LoadMembersByTeamIdAsync(loadedTeamIds, cancellationToken);

        return teams
            .Where(team => team.Slot is not null)
            .Select(team =>
            {
                membersByTeamId.TryGetValue(team.Id, out var members);
                return MapTeamDto(team, members ?? (IReadOnlyList<RegistrationTeamMemberDto>)[]);
            })
            .ToList();
    }

    public async Task<IReadOnlyList<RegistrationTeamDto>> LoadTeamsForGameAsync(
        Guid gameId,
        CancellationToken cancellationToken
    ) => await LoadTeamsDtoAsync(gameId, cancellationToken);

    private async Task<Dictionary<Guid, List<RegistrationTeamMemberDto>>> LoadMembersByTeamIdAsync(
        IReadOnlyCollection<Guid> teamIds,
        CancellationToken cancellationToken
    )
    {
        var members = await _dbContext.GameTeamMembers
            .AsNoTracking()
            .Where(member => teamIds.Contains(member.TeamId) && member.LeftAtUtc == null)
            .Join(
                _dbContext.Users,
                member => member.UserId,
                user => user.Id,
                (member, user) =>
                    new
                    {
                        member.TeamId,
                        Dto = new RegistrationTeamMemberDto(
                            new RegistrationPlayerDto(user.Id, user.Login, user.DisplayName),
                            member.JoinedAtUtc
                        )
                    }
            )
            .ToListAsync(cancellationToken);

        return members
            .GroupBy(member => member.TeamId)
            .ToDictionary(
                group => group.Key,
                group => group.OrderBy(member => member.Dto.JoinedAtUtc).Select(member => member.Dto).ToList()
            );
    }

    private static RegistrationTeamDto MapTeamDto(
        GameTeam team,
        IReadOnlyList<RegistrationTeamMemberDto> members
    ) =>
        new(
            team.Id,
            team.Slot!.SlotIndex,
            team.Slot.Availability,
            team.Slot.ReservedLabel,
            team.RecruitmentOpen,
            team.Status,
            members
        );
}
