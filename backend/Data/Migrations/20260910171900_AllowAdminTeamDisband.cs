using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class AllowAdminTeamDisband : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.Sql(
                """
                CREATE OR REPLACE FUNCTION deadmans_assert_game_finalization(p_game_id uuid)
                RETURNS void
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                DECLARE
                    lifecycle_game games%ROWTYPE;
                    final_snapshot game_finalizations%ROWTYPE;
                    has_final_snapshot boolean;
                    completed_rounds bigint;
                    cancelled_rounds bigint;
                    skipped_quiz_rounds bigint;
                    result_rounds bigint;
                    result_kills bigint;
                    result_bounties bigint;
                    expected_quiz_points bigint;
                BEGIN
                    SELECT * INTO lifecycle_game FROM games WHERE id = p_game_id;
                    IF NOT FOUND THEN RETURN; END IF;

                    SELECT * INTO final_snapshot
                    FROM game_finalizations
                    WHERE game_id = p_game_id;
                    has_final_snapshot := FOUND;

                    IF lifecycle_game.status <> 'finished' THEN
                        IF has_final_snapshot THEN
                            RAISE EXCEPTION 'Only a finished game may have a finalization snapshot.'
                                USING ERRCODE = '23514',
                                      CONSTRAINT = 'ck_game_finalizations_finished_game_only';
                        END IF;
                        RETURN;
                    END IF;

                    IF NOT has_final_snapshot
                       OR final_snapshot.finished_at_utc IS DISTINCT FROM lifecycle_game.finished_at_utc THEN
                        RAISE EXCEPTION 'A finished game requires one timestamp-aligned finalization snapshot.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_finalization_required';
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM game_rounds round
                        WHERE round.game_id = p_game_id
                          AND round.status IN (
                              'awaiting_modifiers', 'preparing', 'in_progress', 'reviewing_results'
                          )
                    ) OR EXISTS (
                        SELECT 1 FROM game_quiz_rounds quiz_round
                        WHERE quiz_round.game_id = p_game_id AND quiz_round.status = 'asked'
                    ) OR EXISTS (
                        SELECT 1 FROM game_modifier_activations activation
                        WHERE activation.game_id = p_game_id
                          AND activation.archived_at_utc IS NULL
                    ) THEN
                        RAISE EXCEPTION 'A finished game cannot retain open runtime state.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_finished_runtime_settled';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM game_teams team
                        LEFT JOIN game_team_final_results result
                          ON result.game_id = team.game_id AND result.team_id = team.id
                        WHERE team.game_id = p_game_id
                          AND team.status = 'confirmed'
                          AND (
                              final_snapshot.calculation_version < 2
                              OR EXISTS (
                                  SELECT 1 FROM game_rounds round
                                  WHERE round.game_id = team.game_id AND round.team_id = team.id
                              )
                          )
                          AND result.team_id IS NULL
                    ) OR EXISTS (
                        SELECT 1
                        FROM game_team_final_results result
                        JOIN game_teams team
                          ON team.game_id = result.game_id AND team.id = result.team_id
                        WHERE result.game_id = p_game_id
                          AND (
                              team.status <> 'confirmed'
                              OR (
                                  final_snapshot.calculation_version >= 2
                                  AND NOT EXISTS (
                                      SELECT 1 FROM game_rounds round
                                      WHERE round.game_id = team.game_id AND round.team_id = team.id
                                  )
                              )
                          )
                    ) THEN
                        RAISE EXCEPTION 'Final results must cover exactly the eligible confirmed game teams.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_finalizations_complete_team_set';
                    END IF;

                    SELECT
                        count(*) FILTER (WHERE status = 'completed'),
                        count(*) FILTER (WHERE status = 'cancelled')
                    INTO completed_rounds, cancelled_rounds
                    FROM game_rounds
                    WHERE game_id = p_game_id;

                    SELECT count(*) INTO skipped_quiz_rounds
                    FROM game_quiz_rounds
                    WHERE game_id = p_game_id AND status = 'skipped';

                    SELECT
                        COALESCE(sum(rounds_played), 0),
                        COALESCE(sum(total_kills), 0),
                        COALESCE(sum(total_bounties), 0)
                    INTO result_rounds, result_kills, result_bounties
                    FROM game_team_final_results
                    WHERE game_id = p_game_id;

                    SELECT LEAST(
                        2147483647::bigint,
                        GREATEST(0::bigint, COALESCE(sum(points_delta), 0))
                    ) INTO expected_quiz_points
                    FROM game_quiz_point_ledger_entries
                    WHERE game_id = p_game_id
                      AND entry_type IN ('quiz_reward', 'manual_adjustment');

                    IF final_snapshot.completed_round_count <> completed_rounds
                       OR final_snapshot.cancelled_round_count <> cancelled_rounds
                       OR final_snapshot.skipped_quiz_question_count <> skipped_quiz_rounds
                       OR result_rounds <> completed_rounds
                       OR final_snapshot.total_kills <> result_kills
                       OR final_snapshot.total_bounties <> result_bounties
                       OR final_snapshot.quiz_total_points <> expected_quiz_points THEN
                        RAISE EXCEPTION 'The finalization aggregates do not match immutable game facts.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_finalizations_aggregate_consistency';
                    END IF;
                END;
                $$;
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM games game
                        WHERE game.status IN ('active', 'finished')
                          AND NOT EXISTS (
                              SELECT 1 FROM game_teams team
                              WHERE team.game_id = game.id AND team.status = 'confirmed'
                          )
                    ) THEN
                        RAISE EXCEPTION 'Cannot restore the previous roster rules while an active or finished game has no confirmed teams.'
                            USING ERRCODE = '55000';
                    END IF;
                    IF EXISTS (
                        SELECT 1 FROM games game
                        JOIN game_teams team ON team.game_id = game.id AND team.status = 'confirmed'
                        LEFT JOIN game_team_final_results result
                          ON result.game_id = team.game_id AND result.team_id = team.id
                        WHERE game.status = 'finished' AND result.team_id IS NULL
                    ) THEN
                        RAISE EXCEPTION 'Cannot restore the previous finalization rules after unplayed teams have been excluded from results.'
                            USING ERRCODE = '55000';
                    END IF;
                END;
                $$;

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

                    IF NOT EXISTS (
                        SELECT 1 FROM game_teams team
                        WHERE team.game_id = p_game_id AND team.status = 'confirmed'
                    )
                       OR EXISTS (
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

                    RAISE EXCEPTION 'The roster of an active or finished game is immutable.'
                        USING ERRCODE = '55000';
                END;
                $$;
                """
            );

            migrationBuilder.Sql(
                """
                CREATE OR REPLACE FUNCTION deadmans_assert_game_finalization(p_game_id uuid)
                RETURNS void
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                DECLARE
                    lifecycle_game games%ROWTYPE;
                    final_snapshot game_finalizations%ROWTYPE;
                    has_final_snapshot boolean;
                    completed_rounds bigint;
                    cancelled_rounds bigint;
                    skipped_quiz_rounds bigint;
                    result_rounds bigint;
                    result_kills bigint;
                    result_bounties bigint;
                    expected_quiz_points bigint;
                BEGIN
                    SELECT * INTO lifecycle_game FROM games WHERE id = p_game_id;
                    IF NOT FOUND THEN RETURN; END IF;

                    SELECT * INTO final_snapshot
                    FROM game_finalizations
                    WHERE game_id = p_game_id;
                    has_final_snapshot := FOUND;

                    IF lifecycle_game.status <> 'finished' THEN
                        IF has_final_snapshot THEN
                            RAISE EXCEPTION 'Only a finished game may have a finalization snapshot.'
                                USING ERRCODE = '23514',
                                      CONSTRAINT = 'ck_game_finalizations_finished_game_only';
                        END IF;
                        RETURN;
                    END IF;

                    IF NOT has_final_snapshot
                       OR final_snapshot.finished_at_utc IS DISTINCT FROM lifecycle_game.finished_at_utc THEN
                        RAISE EXCEPTION 'A finished game requires one timestamp-aligned finalization snapshot.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_finalization_required';
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM game_rounds round
                        WHERE round.game_id = p_game_id
                          AND round.status IN (
                              'awaiting_modifiers', 'preparing', 'in_progress', 'reviewing_results'
                          )
                    ) OR EXISTS (
                        SELECT 1 FROM game_quiz_rounds quiz_round
                        WHERE quiz_round.game_id = p_game_id AND quiz_round.status = 'asked'
                    ) OR EXISTS (
                        SELECT 1 FROM game_modifier_activations activation
                        WHERE activation.game_id = p_game_id
                          AND activation.archived_at_utc IS NULL
                    ) THEN
                        RAISE EXCEPTION 'A finished game cannot retain open runtime state.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_games_finished_runtime_settled';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM game_teams team
                        LEFT JOIN game_team_final_results result
                          ON result.game_id = team.game_id AND result.team_id = team.id
                        WHERE team.game_id = p_game_id
                          AND team.status = 'confirmed'
                          AND result.team_id IS NULL
                    ) OR EXISTS (
                        SELECT 1
                        FROM game_team_final_results result
                        JOIN game_teams team
                          ON team.game_id = result.game_id AND team.id = result.team_id
                        WHERE result.game_id = p_game_id
                          AND team.status <> 'confirmed'
                    ) THEN
                        RAISE EXCEPTION 'Final results must cover exactly the confirmed game teams.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_finalizations_complete_team_set';
                    END IF;

                    SELECT
                        count(*) FILTER (WHERE status = 'completed'),
                        count(*) FILTER (WHERE status = 'cancelled')
                    INTO completed_rounds, cancelled_rounds
                    FROM game_rounds
                    WHERE game_id = p_game_id;

                    SELECT count(*) INTO skipped_quiz_rounds
                    FROM game_quiz_rounds
                    WHERE game_id = p_game_id AND status = 'skipped';

                    SELECT
                        COALESCE(sum(rounds_played), 0),
                        COALESCE(sum(total_kills), 0),
                        COALESCE(sum(total_bounties), 0)
                    INTO result_rounds, result_kills, result_bounties
                    FROM game_team_final_results
                    WHERE game_id = p_game_id;

                    SELECT LEAST(
                        2147483647::bigint,
                        GREATEST(0::bigint, COALESCE(sum(points_delta), 0))
                    ) INTO expected_quiz_points
                    FROM game_quiz_point_ledger_entries
                    WHERE game_id = p_game_id
                      AND entry_type IN ('quiz_reward', 'manual_adjustment');

                    IF final_snapshot.completed_round_count <> completed_rounds
                       OR final_snapshot.cancelled_round_count <> cancelled_rounds
                       OR final_snapshot.skipped_quiz_question_count <> skipped_quiz_rounds
                       OR result_rounds <> completed_rounds
                       OR final_snapshot.total_kills <> result_kills
                       OR final_snapshot.total_bounties <> result_bounties
                       OR final_snapshot.quiz_total_points <> expected_quiz_points THEN
                        RAISE EXCEPTION 'The finalization aggregates do not match immutable game facts.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_finalizations_aggregate_consistency';
                    END IF;
                END;
                $$;
                """
            );
        }
    }
}
