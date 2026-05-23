using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace backend.Infrastructure.Persistence;

internal static class PostgresUniqueViolation
{
    internal const string GamesSingleDraft = "UX_games_single_draft";
    internal const string GamesSingleReady = "UX_games_single_ready";
    internal const string GamesSingleActive = "UX_games_single_active";
    internal const string GameTeamsActiveSlot = "UX_game_teams_active_slot";
    internal const string GameTeamMembersActiveGameUser = "UX_game_team_members_active_game_user";
    internal const string GameTeamMembersActiveTeamUser = "UX_game_team_members_active_team_user";

    internal static bool TryGetConstraintName(DbUpdateException exception, out string? constraintName)
    {
        if (exception.InnerException is PostgresException postgres
            && postgres.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            constraintName = postgres.ConstraintName;
            return true;
        }

        var message = exception.InnerException?.Message ?? exception.Message;
        if (!message.Contains("unique", StringComparison.OrdinalIgnoreCase)
            && !message.Contains("duplicate", StringComparison.OrdinalIgnoreCase))
        {
            constraintName = null;
            return false;
        }

        constraintName = null;
        return true;
    }
}
