using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class AllowCardOpenedRoundTransition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            SetAllowedTransitions(migrationBuilder,
                """
                (OLD.status = 'card_opened' AND NEW.status IN ('awaiting_modifiers', 'cancelled'))
                OR (OLD.status = 'awaiting_modifiers' AND NEW.status IN ('preparing', 'cancelled'))
                OR (OLD.status = 'preparing' AND NEW.status IN ('awaiting_modifiers', 'in_progress', 'cancelled'))
                OR (OLD.status = 'in_progress' AND NEW.status IN ('reviewing_results', 'cancelled'))
                OR (OLD.status = 'reviewing_results' AND NEW.status IN ('in_progress', 'completed', 'cancelled'))
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            SetAllowedTransitions(migrationBuilder,
                """
                (OLD.status = 'awaiting_modifiers' AND NEW.status IN ('preparing', 'in_progress', 'cancelled'))
                OR (OLD.status = 'preparing' AND NEW.status IN ('awaiting_modifiers', 'in_progress', 'cancelled'))
                OR (OLD.status = 'in_progress' AND NEW.status IN ('reviewing_results', 'cancelled'))
                OR (OLD.status = 'reviewing_results' AND NEW.status IN ('in_progress', 'completed', 'cancelled'))
                """);
        }

        private static void SetAllowedTransitions(MigrationBuilder migrationBuilder, string allowedTransitions)
        {
            migrationBuilder.Sql($"""
                CREATE OR REPLACE FUNCTION deadmans_validate_round_update()
                RETURNS trigger
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                BEGIN
                    IF TG_OP = 'DELETE' THEN
                        RAISE EXCEPTION 'Played round history cannot be deleted.'
                            USING ERRCODE = '55000';
                    END IF;

                    IF OLD.status IN ('completed', 'cancelled') THEN
                        RAISE EXCEPTION 'A terminal round is immutable.'
                            USING ERRCODE = '55000';
                    END IF;

                    IF ROW(
                        OLD.id, OLD.game_id, OLD.board_id, OLD.board_cell_id, OLD.team_id,
                        OLD.base_score, OLD.team_slot_index_snapshot,
                        OLD.cell_row_index, OLD.cell_col_index, OLD.cell_title_snapshot,
                        OLD.cell_description_snapshot, OLD.cell_cost_snapshot, OLD.created_at_utc
                    ) IS DISTINCT FROM ROW(
                        NEW.id, NEW.game_id, NEW.board_id, NEW.board_cell_id, NEW.team_id,
                        NEW.base_score, NEW.team_slot_index_snapshot,
                        NEW.cell_row_index, NEW.cell_col_index, NEW.cell_title_snapshot,
                        NEW.cell_description_snapshot, NEW.cell_cost_snapshot, NEW.created_at_utc
                    ) THEN
                        RAISE EXCEPTION 'Round ownership and frozen snapshots are immutable.'
                            USING ERRCODE = '55000';
                    END IF;

                    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
                        IF NEW.version <> OLD.version + 1
                           OR ROW(
                                OLD.id, OLD.game_id, OLD.board_id, OLD.board_cell_id, OLD.team_id,
                                OLD.status, OLD.prepared_at_utc,
                                OLD.gameplay_started_at_utc, OLD.reviewed_at_utc, OLD.finished_at_utc,
                                OLD.base_score, OLD.final_score, OLD.empty_card_penalty_applied,
                                OLD.kills_count, OLD.bounty_count, OLD.team_slot_index_snapshot,
                                OLD.cell_row_index, OLD.cell_col_index, OLD.cell_title_snapshot,
                                OLD.cell_description_snapshot, OLD.cell_cost_snapshot, OLD.notes,
                                OLD.technical_cancellation_reason_code, OLD.public_cancellation_summary,
                                OLD.internal_cancellation_detail, OLD.resolved_by_user_id, OLD.created_at_utc
                           ) IS DISTINCT FROM ROW(
                                NEW.id, NEW.game_id, NEW.board_id, NEW.board_cell_id, NEW.team_id,
                                NEW.status, NEW.prepared_at_utc,
                                NEW.gameplay_started_at_utc, NEW.reviewed_at_utc, NEW.finished_at_utc,
                                NEW.base_score, NEW.final_score, NEW.empty_card_penalty_applied,
                                NEW.kills_count, NEW.bounty_count, NEW.team_slot_index_snapshot,
                                NEW.cell_row_index, NEW.cell_col_index, NEW.cell_title_snapshot,
                                NEW.cell_description_snapshot, NEW.cell_cost_snapshot, NEW.notes,
                                NEW.technical_cancellation_reason_code, NEW.public_cancellation_summary,
                                NEW.internal_cancellation_detail, NEW.resolved_by_user_id, NEW.created_at_utc
                           ) THEN
                            RAISE EXCEPTION 'A same-state round update may only advance its concurrency version.'
                                USING ERRCODE = '23514',
                                      CONSTRAINT = 'ck_game_rounds_same_state_version_update';
                        END IF;
                        RETURN NEW;
                    END IF;

                    IF NEW.version <> OLD.version + 1
                       OR NOT (
                {allowedTransitions}
                       ) THEN
                        RAISE EXCEPTION 'Invalid round lifecycle transition or version.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_rounds_lifecycle_transition';
                    END IF;

                    RETURN NEW;
                END;
                $$;
                """);
        }
    }
}
