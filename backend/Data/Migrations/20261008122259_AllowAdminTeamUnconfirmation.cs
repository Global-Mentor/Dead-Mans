using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Data.Migrations;

public partial class AllowAdminTeamUnconfirmation : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
CREATE OR REPLACE FUNCTION deadmans_protect_active_game_roster()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    new_row jsonb := to_jsonb(NEW);
    old_row jsonb := to_jsonb(OLD);
    affected_game_id uuid := COALESCE(
        (new_row ->> 'game_id')::uuid,
        (old_row ->> 'game_id')::uuid
    );
    game_status text;
BEGIN
    SELECT status INTO game_status FROM games WHERE id = affected_game_id;
    IF NOT FOUND OR game_status NOT IN ('active', 'finished') THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'game_teams'
       AND TG_OP = 'UPDATE'
       AND game_status = 'active'
       AND (new_row - ARRAY['slot_id', 'is_played', 'played_at_utc', 'updated_at_utc'])
           = (old_row - ARRAY['slot_id', 'is_played', 'played_at_utc', 'updated_at_utc']) THEN
        RETURN NEW;
    END IF;

    -- Newly added teams may be assembled by the admin after game start.
    -- Confirmed rosters and frozen round snapshots remain protected.
    IF game_status = 'active' THEN
        IF TG_TABLE_NAME = 'game_teams'
           AND TG_OP = 'INSERT'
           AND new_row ->> 'status' = 'forming'
           AND (new_row ->> 'is_played')::boolean = FALSE THEN
            RETURN NEW;
        END IF;

        IF TG_TABLE_NAME = 'game_teams'
           AND TG_OP = 'UPDATE'
           AND old_row ->> 'status' = 'forming'
           AND new_row ->> 'status' IN ('forming', 'confirmed', 'rejected', 'disbanded')
           AND (new_row ->> 'is_played')::boolean = FALSE
           AND (new_row - ARRAY[
               'name', 'slot_id', 'status', 'recruitment_open', 'updated_at_utc',
               'confirmed_at_utc', 'confirmed_by_user_id', 'rejected_at_utc', 'rejected_by_user_id',
               'disbanded_at_utc', 'disbanded_by_user_id'
           ]) = (old_row - ARRAY[
               'name', 'slot_id', 'status', 'recruitment_open', 'updated_at_utc',
               'confirmed_at_utc', 'confirmed_by_user_id', 'rejected_at_utc', 'rejected_by_user_id',
               'disbanded_at_utc', 'disbanded_by_user_id'
           ]) THEN
            RETURN NEW;
        END IF;

        IF TG_TABLE_NAME = 'game_team_members' AND TG_OP IN ('INSERT', 'UPDATE')
           AND EXISTS (
               SELECT 1 FROM game_teams team
               WHERE team.game_id = affected_game_id AND team.id = (new_row ->> 'team_id')::uuid
                 AND (team.status = 'forming' OR (
                     team.status IN ('rejected', 'disbanded')
                     AND new_row ->> 'left_at_utc' IS NOT NULL
                     AND NOT EXISTS (SELECT 1 FROM game_rounds WHERE team_id = team.id)
                 ))
           )
           AND (TG_OP = 'INSERT' OR (
               old_row ->> 'left_at_utc' IS NULL
               AND (new_row - ARRAY['left_at_utc', 'ready_at_utc'])
                   = (old_row - ARRAY['left_at_utc', 'ready_at_utc'])
           )) THEN
            RETURN NEW;
        END IF;

        IF TG_TABLE_NAME = 'game_team_invitations' AND TG_OP IN ('INSERT', 'UPDATE')
           AND EXISTS (
               SELECT 1 FROM game_teams team
               WHERE team.game_id = affected_game_id AND team.id = (new_row ->> 'team_id')::uuid
                 AND (team.status = 'forming' OR (
                     team.status IN ('rejected', 'disbanded')
                     AND new_row ->> 'status' = 'cancelled'
                 ))
           )
           AND (TG_OP = 'INSERT' OR (
               old_row ->> 'status' = 'pending'
               AND (new_row - ARRAY['slot_id', 'status', 'responded_at_utc'])
                   = (old_row - ARRAY['slot_id', 'status', 'responded_at_utc'])
           )) THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Confirmation may be cancelled before this team participates in the game.
    IF game_status = 'active' AND TG_TABLE_NAME = 'game_teams' AND TG_OP = 'UPDATE'
       AND old_row ->> 'status' = 'confirmed'
       AND new_row ->> 'status' = 'forming'
       AND (old_row ->> 'is_played')::boolean = FALSE
       AND new_row ->> 'confirmed_at_utc' IS NULL
       AND new_row ->> 'confirmed_by_user_id' IS NULL
       AND (new_row - ARRAY['status', 'confirmed_at_utc', 'confirmed_by_user_id', 'updated_at_utc'])
           = (old_row - ARRAY['status', 'confirmed_at_utc', 'confirmed_by_user_id', 'updated_at_utc'])
       AND NOT EXISTS (
           SELECT 1 FROM games
           WHERE id = affected_game_id AND active_team_id = (old_row ->> 'id')::uuid
       )
       AND NOT EXISTS (
           SELECT 1 FROM game_rounds
           WHERE game_id = affected_game_id AND team_id = (old_row ->> 'id')::uuid
       ) THEN
        RETURN NEW;
    END IF;

    -- Only disbanding an unplayed, inactive confirmed team is allowed.
    IF game_status = 'active' AND TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'game_teams'
           AND old_row ->> 'status' = 'confirmed'
           AND new_row ->> 'status' = 'disbanded'
           AND (old_row ->> 'is_played')::boolean = FALSE
           AND (new_row - ARRAY[
               'status', 'recruitment_open', 'disbanded_at_utc', 'disbanded_by_user_id',
               'disband_requested_at_utc', 'disband_requested_by_user_id', 'updated_at_utc'
           ]) = (old_row - ARRAY[
               'status', 'recruitment_open', 'disbanded_at_utc', 'disbanded_by_user_id',
               'disband_requested_at_utc', 'disband_requested_by_user_id', 'updated_at_utc'
           ])
           AND NOT EXISTS (
               SELECT 1 FROM games
               WHERE id = affected_game_id AND active_team_id = (old_row ->> 'id')::uuid
           )
           AND NOT EXISTS (
               SELECT 1 FROM game_rounds
               WHERE game_id = affected_game_id AND team_id = (old_row ->> 'id')::uuid
           ) THEN
            RETURN NEW;
        END IF;

        -- Persist the team's terminal state first; deferred roster checks ensure
        -- that every active membership is closed before the transaction commits.
        IF TG_TABLE_NAME = 'game_team_members'
           AND old_row ->> 'left_at_utc' IS NULL
           AND new_row ->> 'left_at_utc' IS NOT NULL
           AND (new_row - 'left_at_utc') = (old_row - 'left_at_utc')
           AND EXISTS (
               SELECT 1 FROM game_teams
               WHERE game_id = affected_game_id AND id = (old_row ->> 'team_id')::uuid
                 AND status = 'disbanded' AND is_played = FALSE
           ) THEN
            RETURN NEW;
        END IF;
    END IF;

    RAISE EXCEPTION 'The roster of an active or finished game is immutable.'
        USING ERRCODE = '55000';
END;
$$;
""");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
CREATE OR REPLACE FUNCTION deadmans_protect_active_game_roster()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    new_row jsonb := to_jsonb(NEW);
    old_row jsonb := to_jsonb(OLD);
    affected_game_id uuid := COALESCE(
        (new_row ->> 'game_id')::uuid,
        (old_row ->> 'game_id')::uuid
    );
    game_status text;
BEGIN
    SELECT status INTO game_status FROM games WHERE id = affected_game_id;
    IF NOT FOUND OR game_status NOT IN ('active', 'finished') THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'game_teams'
       AND TG_OP = 'UPDATE'
       AND game_status = 'active'
       AND (new_row - ARRAY['slot_id', 'is_played', 'played_at_utc', 'updated_at_utc'])
           = (old_row - ARRAY['slot_id', 'is_played', 'played_at_utc', 'updated_at_utc']) THEN
        RETURN NEW;
    END IF;

    -- Newly added teams may be assembled by the admin after game start.
    -- Confirmed rosters and frozen round snapshots remain protected.
    IF game_status = 'active' THEN
        IF TG_TABLE_NAME = 'game_teams'
           AND TG_OP = 'INSERT'
           AND new_row ->> 'status' = 'forming'
           AND (new_row ->> 'is_played')::boolean = FALSE THEN
            RETURN NEW;
        END IF;

        IF TG_TABLE_NAME = 'game_teams'
           AND TG_OP = 'UPDATE'
           AND old_row ->> 'status' = 'forming'
           AND new_row ->> 'status' IN ('forming', 'confirmed', 'rejected', 'disbanded')
           AND (new_row ->> 'is_played')::boolean = FALSE
           AND (new_row - ARRAY[
               'name', 'slot_id', 'status', 'recruitment_open', 'updated_at_utc',
               'confirmed_at_utc', 'confirmed_by_user_id', 'rejected_at_utc', 'rejected_by_user_id',
               'disbanded_at_utc', 'disbanded_by_user_id'
           ]) = (old_row - ARRAY[
               'name', 'slot_id', 'status', 'recruitment_open', 'updated_at_utc',
               'confirmed_at_utc', 'confirmed_by_user_id', 'rejected_at_utc', 'rejected_by_user_id',
               'disbanded_at_utc', 'disbanded_by_user_id'
           ]) THEN
            RETURN NEW;
        END IF;

        IF TG_TABLE_NAME = 'game_team_members' AND TG_OP IN ('INSERT', 'UPDATE')
           AND EXISTS (
               SELECT 1 FROM game_teams team
               WHERE team.game_id = affected_game_id AND team.id = (new_row ->> 'team_id')::uuid
                 AND (team.status = 'forming' OR (
                     team.status IN ('rejected', 'disbanded')
                     AND new_row ->> 'left_at_utc' IS NOT NULL
                     AND NOT EXISTS (SELECT 1 FROM game_rounds WHERE team_id = team.id)
                 ))
           )
           AND (TG_OP = 'INSERT' OR (
               old_row ->> 'left_at_utc' IS NULL
               AND (new_row - ARRAY['left_at_utc', 'ready_at_utc'])
                   = (old_row - ARRAY['left_at_utc', 'ready_at_utc'])
           )) THEN
            RETURN NEW;
        END IF;

        IF TG_TABLE_NAME = 'game_team_invitations' AND TG_OP IN ('INSERT', 'UPDATE')
           AND EXISTS (
               SELECT 1 FROM game_teams team
               WHERE team.game_id = affected_game_id AND team.id = (new_row ->> 'team_id')::uuid
                 AND (team.status = 'forming' OR (
                     team.status IN ('rejected', 'disbanded')
                     AND new_row ->> 'status' = 'cancelled'
                 ))
           )
           AND (TG_OP = 'INSERT' OR (
               old_row ->> 'status' = 'pending'
               AND (new_row - ARRAY['slot_id', 'status', 'responded_at_utc'])
                   = (old_row - ARRAY['slot_id', 'status', 'responded_at_utc'])
           )) THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Only disbanding an unplayed, inactive confirmed team is allowed.
    IF game_status = 'active' AND TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'game_teams'
           AND old_row ->> 'status' = 'confirmed'
           AND new_row ->> 'status' = 'disbanded'
           AND (old_row ->> 'is_played')::boolean = FALSE
           AND (new_row - ARRAY[
               'status', 'recruitment_open', 'disbanded_at_utc', 'disbanded_by_user_id',
               'disband_requested_at_utc', 'disband_requested_by_user_id', 'updated_at_utc'
           ]) = (old_row - ARRAY[
               'status', 'recruitment_open', 'disbanded_at_utc', 'disbanded_by_user_id',
               'disband_requested_at_utc', 'disband_requested_by_user_id', 'updated_at_utc'
           ])
           AND NOT EXISTS (
               SELECT 1 FROM games
               WHERE id = affected_game_id AND active_team_id = (old_row ->> 'id')::uuid
           )
           AND NOT EXISTS (
               SELECT 1 FROM game_rounds
               WHERE game_id = affected_game_id AND team_id = (old_row ->> 'id')::uuid
           ) THEN
            RETURN NEW;
        END IF;

        -- Persist the team's terminal state first; deferred roster checks ensure
        -- that every active membership is closed before the transaction commits.
        IF TG_TABLE_NAME = 'game_team_members'
           AND old_row ->> 'left_at_utc' IS NULL
           AND new_row ->> 'left_at_utc' IS NOT NULL
           AND (new_row - 'left_at_utc') = (old_row - 'left_at_utc')
           AND EXISTS (
               SELECT 1 FROM game_teams
               WHERE game_id = affected_game_id AND id = (old_row ->> 'team_id')::uuid
                 AND status = 'disbanded' AND is_played = FALSE
           ) THEN
            RETURN NEW;
        END IF;
    END IF;

    RAISE EXCEPTION 'The roster of an active or finished game is immutable.'
        USING ERRCODE = '55000';
END;
$$;
""");
    }
}
