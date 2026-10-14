using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRoundResultPresentation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            SetRoundGuard(migrationBuilder, showingResults: true);
            migrationBuilder.Sql("""
                CREATE FUNCTION deadmans_guard_result_presentation() RETURNS trigger
                LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
                BEGIN
                    IF NEW.status = 'finished' AND EXISTS (
                        SELECT 1 FROM game_rounds WHERE game_id = NEW.id AND status = 'showing_results'
                    ) THEN
                        RAISE EXCEPTION 'End result presentation before finishing the game.'
                            USING ERRCODE = '23514', CONSTRAINT = 'ck_games_finished_runtime_settled';
                    END IF;
                    RETURN NEW;
                END;
                $$;
                CREATE TRIGGER trg_games_result_presentation
                    BEFORE UPDATE OF status ON games FOR EACH ROW
                    EXECUTE FUNCTION deadmans_guard_result_presentation();
                """);
            migrationBuilder.DropIndex(
                name: "ux_game_rounds_single_nonterminal_game",
                table: "game_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_rounds_empty_card_penalty_semantics",
                table: "game_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_rounds_finished_at_semantics",
                table: "game_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_rounds_lifecycle_timestamps",
                table: "game_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_rounds_resolution_semantics",
                table: "game_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_rounds_status_allowed",
                table: "game_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_round_transition_audits_action_allowed",
                table: "game_round_transition_audits");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_round_transition_audits_action_semantics",
                table: "game_round_transition_audits");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_round_transition_audits_statuses_allowed",
                table: "game_round_transition_audits");

            migrationBuilder.AddColumn<bool>(
                name: "mark_team_played_after_presentation",
                table: "game_rounds",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "ux_game_rounds_single_nonterminal_game",
                table: "game_rounds",
                column: "game_id",
                unique: true,
                filter: "status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results','showing_results')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_empty_card_penalty_semantics",
                table: "game_rounds",
                sql: "(empty_card_penalty_applied = false) OR (status IN ('showing_results','completed') AND final_score IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_finished_at_semantics",
                table: "game_rounds",
                sql: "((status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results')) AND finished_at_utc IS NULL) OR ((status IN ('showing_results','completed','cancelled')) AND finished_at_utc IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_lifecycle_timestamps",
                table: "game_rounds",
                sql: "(status IN ('card_opened','awaiting_modifiers') AND prepared_at_utc IS NULL AND gameplay_started_at_utc IS NULL AND reviewed_at_utc IS NULL) OR (status = 'preparing' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NULL AND reviewed_at_utc IS NULL) OR (status = 'in_progress' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc IS NULL) OR (status = 'reviewing_results' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc IS NOT NULL) OR (status IN ('showing_results','completed') AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc IS NOT NULL) OR (status = 'cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_resolution_semantics",
                table: "game_rounds",
                sql: "((status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results')) AND final_score IS NULL AND resolved_by_user_id IS NULL) OR ((status IN ('showing_results','completed')) AND final_score IS NOT NULL AND resolved_by_user_id IS NOT NULL) OR ((status = 'cancelled') AND final_score = 0 AND resolved_by_user_id IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_status_allowed",
                table: "game_rounds",
                sql: "status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results','showing_results','completed','cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_round_transition_audits_action_allowed",
                table: "game_round_transition_audits",
                sql: "action_code IN ('start_modifier_ordering','prepare','rebuild','begin_gameplay','review','resume_gameplay','finish_presentation','finalize','technical_cancel')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_round_transition_audits_action_semantics",
                table: "game_round_transition_audits",
                sql: "(action_code = 'start_modifier_ordering' AND from_status = 'card_opened' AND to_status = 'awaiting_modifiers') OR (action_code = 'prepare' AND from_status = 'awaiting_modifiers' AND to_status = 'preparing') OR (action_code = 'rebuild' AND from_status = 'preparing' AND to_status = 'awaiting_modifiers') OR (action_code = 'begin_gameplay' AND from_status = 'preparing' AND to_status = 'in_progress') OR (action_code = 'review' AND from_status = 'in_progress' AND to_status = 'reviewing_results') OR (action_code = 'resume_gameplay' AND from_status = 'reviewing_results' AND to_status = 'in_progress') OR (action_code = 'finalize' AND from_status = 'reviewing_results' AND to_status IN ('showing_results','completed')) OR (action_code = 'finish_presentation' AND from_status = 'showing_results' AND to_status = 'completed') OR (action_code = 'technical_cancel' AND from_status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results') AND to_status = 'cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_round_transition_audits_statuses_allowed",
                table: "game_round_transition_audits",
                sql: "(from_status IS NULL OR from_status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results','showing_results','completed','cancelled')) AND to_status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results','showing_results','completed','cancelled')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM game_rounds WHERE status = 'showing_results') THEN
                        RAISE EXCEPTION 'End result presentation before reverting this migration.';
                    END IF;
                END $$;
                DROP TRIGGER trg_games_result_presentation ON games;
                DROP FUNCTION deadmans_guard_result_presentation();
                """);
            SetRoundGuard(migrationBuilder, showingResults: false);
            migrationBuilder.DropIndex(
                name: "ux_game_rounds_single_nonterminal_game",
                table: "game_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_rounds_empty_card_penalty_semantics",
                table: "game_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_rounds_finished_at_semantics",
                table: "game_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_rounds_lifecycle_timestamps",
                table: "game_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_rounds_resolution_semantics",
                table: "game_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_rounds_status_allowed",
                table: "game_rounds");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_round_transition_audits_action_allowed",
                table: "game_round_transition_audits");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_round_transition_audits_action_semantics",
                table: "game_round_transition_audits");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_round_transition_audits_statuses_allowed",
                table: "game_round_transition_audits");

            migrationBuilder.DropColumn(
                name: "mark_team_played_after_presentation",
                table: "game_rounds");

            migrationBuilder.CreateIndex(
                name: "ux_game_rounds_single_nonterminal_game",
                table: "game_rounds",
                column: "game_id",
                unique: true,
                filter: "status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_empty_card_penalty_semantics",
                table: "game_rounds",
                sql: "(empty_card_penalty_applied = false) OR (status = 'completed' AND final_score IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_finished_at_semantics",
                table: "game_rounds",
                sql: "((status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results')) AND finished_at_utc IS NULL) OR ((status IN ('completed','cancelled')) AND finished_at_utc IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_lifecycle_timestamps",
                table: "game_rounds",
                sql: "(status IN ('card_opened','awaiting_modifiers') AND prepared_at_utc IS NULL AND gameplay_started_at_utc IS NULL AND reviewed_at_utc IS NULL) OR (status = 'preparing' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NULL AND reviewed_at_utc IS NULL) OR (status = 'in_progress' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc IS NULL) OR (status = 'reviewing_results' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc IS NOT NULL) OR (status = 'completed' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc IS NOT NULL) OR (status = 'cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_resolution_semantics",
                table: "game_rounds",
                sql: "((status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results')) AND final_score IS NULL AND resolved_by_user_id IS NULL) OR ((status = 'completed') AND final_score IS NOT NULL AND resolved_by_user_id IS NOT NULL) OR ((status = 'cancelled') AND final_score = 0 AND resolved_by_user_id IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_status_allowed",
                table: "game_rounds",
                sql: "status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results','completed','cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_round_transition_audits_action_allowed",
                table: "game_round_transition_audits",
                sql: "action_code IN ('start_modifier_ordering','prepare','rebuild','begin_gameplay','review','resume_gameplay','finalize','technical_cancel')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_round_transition_audits_action_semantics",
                table: "game_round_transition_audits",
                sql: "(action_code = 'start_modifier_ordering' AND from_status = 'card_opened' AND to_status = 'awaiting_modifiers') OR (action_code = 'prepare' AND from_status = 'awaiting_modifiers' AND to_status = 'preparing') OR (action_code = 'rebuild' AND from_status = 'preparing' AND to_status = 'awaiting_modifiers') OR (action_code = 'begin_gameplay' AND from_status = 'preparing' AND to_status = 'in_progress') OR (action_code = 'review' AND from_status = 'in_progress' AND to_status = 'reviewing_results') OR (action_code = 'resume_gameplay' AND from_status = 'reviewing_results' AND to_status = 'in_progress') OR (action_code = 'finalize' AND from_status = 'reviewing_results' AND to_status = 'completed') OR (action_code = 'technical_cancel' AND from_status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results') AND to_status = 'cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_round_transition_audits_statuses_allowed",
                table: "game_round_transition_audits",
                sql: "(from_status IS NULL OR from_status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results','completed','cancelled')) AND to_status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results','completed','cancelled')");
        }
        private static void SetRoundGuard(MigrationBuilder migrationBuilder, bool showingResults)
        {
            var finalizeStatus = showingResults ? "showing_results" : "completed";
            var presentationGuard = showingResults ? """
                IF OLD.status = 'showing_results' THEN
                    IF NEW.status <> 'completed' OR NEW.version <> OLD.version + 1
                       OR (to_jsonb(OLD) - ARRAY['status','version','updated_at_utc'])
                          IS DISTINCT FROM (to_jsonb(NEW) - ARRAY['status','version','updated_at_utc']) THEN
                        RAISE EXCEPTION 'Saved round results are immutable during presentation.'
                            USING ERRCODE = '55000';
                    END IF;
                    RETURN NEW;
                END IF;
                IF OLD.mark_team_played_after_presentation IS DISTINCT FROM NEW.mark_team_played_after_presentation
                   AND NOT (OLD.status = 'reviewing_results' AND NEW.status = 'showing_results') THEN
                    RAISE EXCEPTION 'The post-round action is saved with the result.' USING ERRCODE = '55000';
                END IF;
                """ : "";
            migrationBuilder.Sql($"""
                CREATE OR REPLACE FUNCTION deadmans_validate_round_update()
                RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
                BEGIN
                    IF TG_OP = 'DELETE' OR OLD.status IN ('completed', 'cancelled') THEN
                        RAISE EXCEPTION 'Played round history is immutable.' USING ERRCODE = '55000';
                    END IF;
                    {presentationGuard}
                    IF ROW(OLD.id, OLD.game_id, OLD.board_id, OLD.board_cell_id, OLD.team_id,
                        OLD.base_score, OLD.team_slot_index_snapshot, OLD.cell_row_index, OLD.cell_col_index,
                        OLD.cell_title_snapshot, OLD.cell_description_snapshot, OLD.cell_cost_snapshot, OLD.created_at_utc)
                        IS DISTINCT FROM ROW(NEW.id, NEW.game_id, NEW.board_id, NEW.board_cell_id, NEW.team_id,
                        NEW.base_score, NEW.team_slot_index_snapshot, NEW.cell_row_index, NEW.cell_col_index,
                        NEW.cell_title_snapshot, NEW.cell_description_snapshot, NEW.cell_cost_snapshot, NEW.created_at_utc) THEN
                        RAISE EXCEPTION 'Round ownership and frozen snapshots are immutable.' USING ERRCODE = '55000';
                    END IF;
                    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
                        IF NEW.version <> OLD.version + 1
                           OR (to_jsonb(OLD) - ARRAY['version','updated_at_utc'])
                              IS DISTINCT FROM (to_jsonb(NEW) - ARRAY['version','updated_at_utc']) THEN
                            RAISE EXCEPTION 'A same-state round update may only advance its concurrency version.'
                                USING ERRCODE = '23514', CONSTRAINT = 'ck_game_rounds_same_state_version_update';
                        END IF;
                        RETURN NEW;
                    END IF;
                    IF NEW.version <> OLD.version + 1 OR NOT (
                        (OLD.status = 'card_opened' AND NEW.status IN ('awaiting_modifiers','cancelled'))
                        OR (OLD.status = 'awaiting_modifiers' AND NEW.status IN ('preparing','cancelled'))
                        OR (OLD.status = 'preparing' AND NEW.status IN ('awaiting_modifiers','in_progress','cancelled'))
                        OR (OLD.status = 'in_progress' AND NEW.status IN ('reviewing_results','cancelled'))
                        OR (OLD.status = 'reviewing_results' AND NEW.status IN ('in_progress','{finalizeStatus}','cancelled'))
                    ) THEN
                        RAISE EXCEPTION 'Invalid round lifecycle transition or version.'
                            USING ERRCODE = '23514', CONSTRAINT = 'ck_game_rounds_lifecycle_transition';
                    END IF;
                    RETURN NEW;
                END;
                $$;
                """);
        }
    }
}
