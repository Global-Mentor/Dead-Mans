using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDynamicTeamLimit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "team_limit",
                table: "games",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql("""
ALTER TABLE games DISABLE TRIGGER trg_games_lifecycle_transition;
UPDATE games SET team_limit = COALESCE(NULLIF((
    SELECT COUNT(*) FROM game_team_slots WHERE game_id = games.id AND slot_type = 'public'
), 0), 10);
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE games ENABLE TRIGGER trg_games_lifecycle_transition;
SET CONSTRAINTS ALL DEFERRED;
CREATE FUNCTION deadmans_protect_finished_team_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF OLD.status = 'finished' AND NEW.team_limit IS DISTINCT FROM OLD.team_limit THEN
        RAISE EXCEPTION 'Finished game team limit is immutable.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_games_team_limit_history BEFORE UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION deadmans_protect_finished_team_limit();
""");
            migrationBuilder.Sql("""
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

                -- Team creation may append one slot inside the roster transaction.
                IF TG_TABLE_NAME = 'game_team_slots'
                   AND TG_OP = 'INSERT'
                   AND game_status IN ('ready', 'active')
                   AND new_row ->> 'id' = current_setting('deadmans.additional_team_slot', true)
                   AND new_row ->> 'slot_type' IN ('public', 'reserved')
                   AND (new_row ->> 'slot_index')::integer = (
                       SELECT COALESCE(MAX(slot_index), 0) + 1 FROM game_team_slots
                       WHERE game_id = affected_game_id
                   ) THEN
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

""");
            migrationBuilder.AddCheckConstraint(
                name: "ck_games_team_limit",
                table: "games",
                sql: "team_limit IS NULL OR team_limit BETWEEN 1 AND 1000");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
DROP TRIGGER trg_games_team_limit_history ON games;
DROP FUNCTION deadmans_protect_finished_team_limit();
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

                -- Administrative overflow may append one reserved slot inside the roster transaction.
                IF TG_TABLE_NAME = 'game_team_slots'
                   AND TG_OP = 'INSERT'
                   AND game_status IN ('ready', 'active')
                   AND new_row ->> 'id' = current_setting('deadmans.additional_team_slot', true)
                   AND new_row ->> 'slot_type' = 'reserved'
                   AND (new_row ->> 'slot_index')::integer = (
                       SELECT COALESCE(MAX(slot_index), 0) + 1 FROM game_team_slots
                       WHERE game_id = affected_game_id
                   ) THEN
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

""");
            migrationBuilder.DropCheckConstraint(
                name: "ck_games_team_limit",
                table: "games");

            migrationBuilder.DropColumn(
                name: "team_limit",
                table: "games");
        }
    }
}
