using backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace backend.Data.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260917140000_AllowAdminTeamManagement")]
public sealed class AllowAdminTeamManagement : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            CREATE OR REPLACE FUNCTION deadmans_protect_published_board_configuration()
            RETURNS trigger
            LANGUAGE plpgsql
            SET search_path = public, pg_temp
            AS $$
            DECLARE
                affected_game_id uuid;
                game_status text;
                new_row jsonb := to_jsonb(NEW);
                old_row jsonb := to_jsonb(OLD);
                entity_id uuid;
            BEGIN
                IF TG_TABLE_NAME = 'game_boards' THEN
                    affected_game_id := COALESCE(
                        (new_row ->> 'game_id')::uuid,
                        (old_row ->> 'game_id')::uuid
                    );
                ELSIF TG_TABLE_NAME = 'game_team_slots' THEN
                    affected_game_id := COALESCE(
                        (new_row ->> 'game_id')::uuid,
                        (old_row ->> 'game_id')::uuid
                    );
                ELSIF TG_TABLE_NAME = 'game_board_cells' THEN
                    entity_id := COALESCE(
                        (new_row ->> 'board_id')::uuid,
                        (old_row ->> 'board_id')::uuid
                    );
                    SELECT game_id INTO affected_game_id
                    FROM game_boards WHERE id = entity_id;
                ELSE
                    entity_id := COALESCE(
                        (new_row ->> 'cell_id')::uuid,
                        (old_row ->> 'cell_id')::uuid
                    );
                    SELECT board.game_id INTO affected_game_id
                    FROM game_board_cells cell
                    JOIN game_boards board ON board.id = cell.board_id
                    WHERE cell.id = entity_id;
                END IF;

                SELECT status INTO game_status FROM games WHERE id = affected_game_id;
                IF NOT FOUND OR game_status = 'draft' THEN
                    IF TG_OP = 'DELETE' THEN
                        RETURN OLD;
                    END IF;
                    RETURN NEW;
                END IF;

                -- A transactional swap buffer must disappear before commit; real slots stay immutable.
                IF TG_TABLE_NAME = 'game_team_slots'
                   AND game_status IN ('ready', 'active')
                   AND TG_OP IN ('INSERT', 'DELETE')
                   AND COALESCE(new_row ->> 'id', old_row ->> 'id')
                       = current_setting('deadmans.team_swap_buffer', true) THEN
                    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
                    RETURN NEW;
                END IF;

                IF TG_TABLE_NAME = 'game_boards'
                   AND TG_OP = 'UPDATE'
                   AND game_status IN ('active', 'finished')
                   AND (new_row ->> 'version')::integer = (old_row ->> 'version')::integer + 1
                   AND (new_row - ARRAY['version', 'updated_at_utc'])
                       = (old_row - ARRAY['version', 'updated_at_utc']) THEN
                    RETURN NEW;
                END IF;

                IF TG_TABLE_NAME = 'game_board_cells'
                   AND TG_OP = 'UPDATE'
                   AND game_status = 'active'
                   AND (
                       (old_row ->> 'state' = 'closed' AND new_row ->> 'state' = 'open')
                       OR (old_row ->> 'state' = 'open' AND new_row ->> 'state' = 'cancelled')
                   )
                   AND (new_row - 'state') = (old_row - 'state') THEN
                    RETURN NEW;
                END IF;

                RAISE EXCEPTION 'Published % row cannot be changed by % while game % is %.',
                    TG_TABLE_NAME, TG_OP, affected_game_id, game_status
                    USING ERRCODE = '55000';
            END;
            $$;

            CREATE FUNCTION deadmans_validate_team_swap_buffer()
            RETURNS trigger
            LANGUAGE plpgsql
            SET search_path = public, pg_temp
            AS $$
            BEGIN
                IF NEW.id::text = current_setting('deadmans.team_swap_buffer', true)
                   AND EXISTS (SELECT 1 FROM game_team_slots WHERE id = NEW.id) THEN
                    RAISE EXCEPTION 'A team swap buffer must be removed before commit.'
                        USING ERRCODE = '23514', CONSTRAINT = 'ck_team_swap_buffer_temporary';
                END IF;
                RETURN NULL;
            END;
            $$;

            CREATE CONSTRAINT TRIGGER trg_game_team_slots_swap_buffer
                AFTER INSERT ON game_team_slots
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW EXECUTE FUNCTION deadmans_validate_team_swap_buffer();
            """
        );
        migrationBuilder.Sql(
            """
                CREATE OR REPLACE FUNCTION deadmans_assert_game_roster(p_game_id uuid)
                RETURNS void
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                DECLARE
                    roster_game games%ROWTYPE;
                BEGIN
                    SELECT * INTO roster_game FROM games WHERE id = p_game_id;
                    IF NOT FOUND OR roster_game.status NOT IN ('active', 'finished') THEN
                        RETURN;
                    END IF;

                    IF EXISTS (
                           SELECT 1 FROM game_teams team
                           WHERE team.game_id = p_game_id AND team.status = 'forming'
                             AND roster_game.status = 'finished'
                       )
                       OR EXISTS (
                           SELECT 1 FROM game_team_invitations invitation
                           WHERE invitation.game_id = p_game_id AND invitation.status = 'pending'
                             AND (roster_game.status = 'finished' OR NOT EXISTS (
                                 SELECT 1 FROM game_teams team
                                 WHERE team.id = invitation.team_id AND team.game_id = p_game_id
                                   AND team.status = 'forming'
                             ))
                       )
                       OR EXISTS (
                           SELECT 1 FROM game_teams team
                           WHERE team.game_id = p_game_id
                             AND team.status = 'confirmed'
                             AND team.disband_requested_at_utc IS NOT NULL
                       ) THEN
                        RAISE EXCEPTION 'An active game requires a settled confirmed roster.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_active_roster_settled';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM game_team_members member
                        JOIN game_teams team
                          ON team.game_id = member.game_id AND team.id = member.team_id
                        WHERE member.game_id = p_game_id
                          AND member.left_at_utc IS NULL
                          AND team.status <> 'confirmed'
                          AND NOT (roster_game.status = 'active' AND team.status = 'forming')
                    ) THEN
                        RAISE EXCEPTION 'Only confirmed teams may retain active members in an active game.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_active_roster_confirmed_members';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM game_teams team
                        LEFT JOIN game_team_members member
                          ON member.game_id = team.game_id
                         AND member.team_id = team.id
                         AND member.left_at_utc IS NULL
                        WHERE team.game_id = p_game_id
                          AND team.status = 'confirmed'
                        GROUP BY team.id
                        HAVING count(member.id) < roster_game.min_players_per_team
                            OR count(member.id) > roster_game.max_players_per_team
                    ) THEN
                        RAISE EXCEPTION 'Every confirmed team must satisfy the game roster limits.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_active_roster_size';
                    END IF;
                END;
                $$;

                CREATE OR REPLACE FUNCTION deadmans_validate_game_roster_trigger()
                RETURNS trigger
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                DECLARE
                    new_row jsonb := to_jsonb(NEW);
                    old_row jsonb := to_jsonb(OLD);
                    affected_game_id uuid;
                BEGIN
                    affected_game_id := CASE
                        WHEN TG_TABLE_NAME = 'games' THEN COALESCE(
                            (new_row ->> 'id')::uuid,
                            (old_row ->> 'id')::uuid
                        )
                        ELSE COALESCE(
                            (new_row ->> 'game_id')::uuid,
                            (old_row ->> 'game_id')::uuid
                        )
                    END;
                    -- Starting still requires a confirmed team. Afterwards all unplayed teams
                    -- may be disbanded, leaving an empty roster without corrupting history.
                    IF TG_TABLE_NAME = 'games'
                       AND new_row ->> 'status' = 'active'
                       AND old_row ->> 'status' IS DISTINCT FROM 'active'
                       AND (NOT EXISTS (
                           SELECT 1 FROM game_teams
                           WHERE game_id = affected_game_id AND status = 'confirmed'
                       ) OR EXISTS (
                           SELECT 1 FROM game_teams
                           WHERE game_id = affected_game_id AND status = 'forming'
                       ) OR EXISTS (
                           SELECT 1 FROM game_team_invitations
                           WHERE game_id = affected_game_id AND status = 'pending'
                       )) THEN
                        RAISE EXCEPTION 'Starting a game requires a confirmed roster.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_active_roster_settled';
                    END IF;

                    IF affected_game_id IS NOT NULL THEN
                        PERFORM deadmans_assert_game_roster(affected_game_id);
                    END IF;
                    RETURN NULL;
                END;
                $$;

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
            """
        );
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DROP TRIGGER trg_game_team_slots_swap_buffer ON game_team_slots;
            DROP FUNCTION deadmans_validate_team_swap_buffer();
            CREATE OR REPLACE FUNCTION deadmans_protect_published_board_configuration()
            RETURNS trigger
            LANGUAGE plpgsql
            SET search_path = public, pg_temp
            AS $$
            DECLARE
                affected_game_id uuid;
                game_status text;
                new_row jsonb := to_jsonb(NEW);
                old_row jsonb := to_jsonb(OLD);
                entity_id uuid;
            BEGIN
                IF TG_TABLE_NAME = 'game_boards' THEN
                    affected_game_id := COALESCE(
                        (new_row ->> 'game_id')::uuid,
                        (old_row ->> 'game_id')::uuid
                    );
                ELSIF TG_TABLE_NAME = 'game_team_slots' THEN
                    affected_game_id := COALESCE(
                        (new_row ->> 'game_id')::uuid,
                        (old_row ->> 'game_id')::uuid
                    );
                ELSIF TG_TABLE_NAME = 'game_board_cells' THEN
                    entity_id := COALESCE(
                        (new_row ->> 'board_id')::uuid,
                        (old_row ->> 'board_id')::uuid
                    );
                    SELECT game_id INTO affected_game_id
                    FROM game_boards WHERE id = entity_id;
                ELSE
                    entity_id := COALESCE(
                        (new_row ->> 'cell_id')::uuid,
                        (old_row ->> 'cell_id')::uuid
                    );
                    SELECT board.game_id INTO affected_game_id
                    FROM game_board_cells cell
                    JOIN game_boards board ON board.id = cell.board_id
                    WHERE cell.id = entity_id;
                END IF;

                SELECT status INTO game_status FROM games WHERE id = affected_game_id;
                IF NOT FOUND OR game_status = 'draft' THEN
                    IF TG_OP = 'DELETE' THEN
                        RETURN OLD;
                    END IF;
                    RETURN NEW;
                END IF;

                IF TG_TABLE_NAME = 'game_boards'
                   AND TG_OP = 'UPDATE'
                   AND game_status IN ('active', 'finished')
                   AND (new_row ->> 'version')::integer = (old_row ->> 'version')::integer + 1
                   AND (new_row - ARRAY['version', 'updated_at_utc'])
                       = (old_row - ARRAY['version', 'updated_at_utc']) THEN
                    RETURN NEW;
                END IF;

                IF TG_TABLE_NAME = 'game_board_cells'
                   AND TG_OP = 'UPDATE'
                   AND game_status = 'active'
                   AND (
                       (old_row ->> 'state' = 'closed' AND new_row ->> 'state' = 'open')
                       OR (old_row ->> 'state' = 'open' AND new_row ->> 'state' = 'cancelled')
                   )
                   AND (new_row - 'state') = (old_row - 'state') THEN
                    RETURN NEW;
                END IF;

                RAISE EXCEPTION 'Published % row cannot be changed by % while game % is %.',
                    TG_TABLE_NAME, TG_OP, affected_game_id, game_status
                    USING ERRCODE = '55000';
            END;
            $$;
            """
        );
        migrationBuilder.Sql(
            """
                CREATE OR REPLACE FUNCTION deadmans_assert_game_roster(p_game_id uuid)
                RETURNS void
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                DECLARE
                    roster_game games%ROWTYPE;
                BEGIN
                    SELECT * INTO roster_game FROM games WHERE id = p_game_id;
                    IF NOT FOUND OR roster_game.status NOT IN ('active', 'finished') THEN
                        RETURN;
                    END IF;

                    IF EXISTS (
                           SELECT 1 FROM game_teams team
                           WHERE team.game_id = p_game_id AND team.status = 'forming'
                       )
                       OR EXISTS (
                           SELECT 1 FROM game_team_invitations invitation
                           WHERE invitation.game_id = p_game_id AND invitation.status = 'pending'
                       )
                       OR EXISTS (
                           SELECT 1 FROM game_teams team
                           WHERE team.game_id = p_game_id
                             AND team.status = 'confirmed'
                             AND team.disband_requested_at_utc IS NOT NULL
                       ) THEN
                        RAISE EXCEPTION 'An active game requires a settled confirmed roster.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_active_roster_settled';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM game_team_members member
                        JOIN game_teams team
                          ON team.game_id = member.game_id AND team.id = member.team_id
                        WHERE member.game_id = p_game_id
                          AND member.left_at_utc IS NULL
                          AND team.status <> 'confirmed'
                    ) THEN
                        RAISE EXCEPTION 'Only confirmed teams may retain active members in an active game.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_active_roster_confirmed_members';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM game_teams team
                        LEFT JOIN game_team_members member
                          ON member.game_id = team.game_id
                         AND member.team_id = team.id
                         AND member.left_at_utc IS NULL
                        WHERE team.game_id = p_game_id
                          AND team.status = 'confirmed'
                        GROUP BY team.id
                        HAVING count(member.id) < roster_game.min_players_per_team
                            OR count(member.id) > roster_game.max_players_per_team
                    ) THEN
                        RAISE EXCEPTION 'Every confirmed team must satisfy the game roster limits.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_active_roster_size';
                    END IF;
                END;
                $$;

                CREATE OR REPLACE FUNCTION deadmans_validate_game_roster_trigger()
                RETURNS trigger
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                DECLARE
                    new_row jsonb := to_jsonb(NEW);
                    old_row jsonb := to_jsonb(OLD);
                    affected_game_id uuid;
                BEGIN
                    affected_game_id := CASE
                        WHEN TG_TABLE_NAME = 'games' THEN COALESCE(
                            (new_row ->> 'id')::uuid,
                            (old_row ->> 'id')::uuid
                        )
                        ELSE COALESCE(
                            (new_row ->> 'game_id')::uuid,
                            (old_row ->> 'game_id')::uuid
                        )
                    END;
                    -- Starting still requires a confirmed team. Afterwards all unplayed teams
                    -- may be disbanded, leaving an empty roster without corrupting history.
                    IF TG_TABLE_NAME = 'games'
                       AND new_row ->> 'status' = 'active'
                       AND old_row ->> 'status' IS DISTINCT FROM 'active'
                       AND NOT EXISTS (
                           SELECT 1 FROM game_teams
                           WHERE game_id = affected_game_id AND status = 'confirmed'
                       ) THEN
                        RAISE EXCEPTION 'Starting a game requires a confirmed roster.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_active_roster_settled';
                    END IF;

                    IF affected_game_id IS NOT NULL THEN
                        PERFORM deadmans_assert_game_roster(affected_game_id);
                    END IF;
                    RETURN NULL;
                END;
                $$;

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
                       AND (new_row - ARRAY['is_played', 'played_at_utc', 'updated_at_utc'])
                           = (old_row - ARRAY['is_played', 'played_at_utc', 'updated_at_utc']) THEN
                        RETURN NEW;
                    END IF;

                    -- Only disbanding an unplayed, inactive team may change an active roster.
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
            """
        );
    }
}
