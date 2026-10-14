using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Data.Migrations
{
    /// <inheritdoc />
    public partial class AllowAdditionalAdminTeamSlots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

CREATE FUNCTION deadmans_validate_additional_team_slot()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF NEW.id::text = current_setting('deadmans.additional_team_slot', true)
       AND NOT EXISTS (SELECT 1 FROM game_teams WHERE game_id = NEW.game_id
                       AND slot_id = NEW.id AND status IN ('forming', 'confirmed')) THEN
        RAISE EXCEPTION 'An additional administrative slot must contain its team at commit.'
            USING ERRCODE = '23514', CONSTRAINT = 'ck_additional_team_slot_occupied';
    END IF;
    RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER trg_validate_additional_team_slot
AFTER INSERT ON game_team_slots DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION deadmans_validate_additional_team_slot();

""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
DROP TRIGGER trg_validate_additional_team_slot ON game_team_slots;
DROP FUNCTION deadmans_validate_additional_team_slot();
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
""");
        }
    }
}
