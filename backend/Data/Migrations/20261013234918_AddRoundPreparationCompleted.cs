using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRoundPreparationCompleted : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $migration$
                DECLARE definition text;
                BEGIN
                    SELECT pg_get_functiondef('deadmans_validate_round_update()'::regprocedure) INTO definition;
                    IF strpos(definition, $old$(OLD.status = 'preparing' AND NEW.status IN ('awaiting_modifiers','in_progress','cancelled'))$old$) = 0 THEN
                        RAISE EXCEPTION 'Unexpected round lifecycle guard definition.';
                    END IF;
                    EXECUTE replace(definition, $old$(OLD.status = 'preparing' AND NEW.status IN ('awaiting_modifiers','in_progress','cancelled'))$old$, $new$(OLD.status = 'preparing' AND NEW.status IN ('awaiting_modifiers','preparation_completed','cancelled')) OR (OLD.status = 'preparation_completed' AND NEW.status IN ('in_progress','cancelled'))$new$);
                    SELECT pg_get_functiondef('deadmans_assert_game_finalization(uuid)'::regprocedure) INTO definition;
                    EXECUTE replace(definition, $old$'preparing'$old$, $new$'preparing', 'preparation_completed'$new$);
                END;
                $migration$;
                """);

            migrationBuilder.DropIndex(
                name: "ux_game_rounds_single_nonterminal_game",
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

            migrationBuilder.CreateIndex(
                name: "ux_game_rounds_single_nonterminal_game",
                table: "game_rounds",
                column: "game_id",
                unique: true,
                filter: "status IN ('card_opened','awaiting_modifiers','preparing','preparation_completed','in_progress','reviewing_results','showing_results')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_finished_at_semantics",
                table: "game_rounds",
                sql: "((status IN ('card_opened','awaiting_modifiers','preparing','preparation_completed','in_progress','reviewing_results')) AND finished_at_utc IS NULL) OR ((status IN ('showing_results','completed','cancelled')) AND finished_at_utc IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_lifecycle_timestamps",
                table: "game_rounds",
                sql: "(status IN ('card_opened','awaiting_modifiers') AND prepared_at_utc IS NULL AND gameplay_started_at_utc IS NULL AND reviewed_at_utc IS NULL) OR (status IN ('preparing','preparation_completed') AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NULL AND reviewed_at_utc IS NULL) OR (status = 'in_progress' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc IS NULL) OR (status = 'reviewing_results' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc IS NOT NULL) OR (status IN ('showing_results','completed') AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc IS NOT NULL) OR (status = 'cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_resolution_semantics",
                table: "game_rounds",
                sql: "((status IN ('card_opened','awaiting_modifiers','preparing','preparation_completed','in_progress','reviewing_results')) AND final_score IS NULL AND resolved_by_user_id IS NULL) OR ((status IN ('showing_results','completed')) AND final_score IS NOT NULL AND resolved_by_user_id IS NOT NULL) OR ((status = 'cancelled') AND final_score = 0 AND resolved_by_user_id IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_rounds_status_allowed",
                table: "game_rounds",
                sql: "status IN ('card_opened','awaiting_modifiers','preparing','preparation_completed','in_progress','reviewing_results','showing_results','completed','cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_round_transition_audits_action_allowed",
                table: "game_round_transition_audits",
                sql: "action_code IN ('start_modifier_ordering','prepare','rebuild','complete_preparation','begin_gameplay','review','resume_gameplay','finish_presentation','finalize','technical_cancel')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_round_transition_audits_action_semantics",
                table: "game_round_transition_audits",
                sql: "(action_code = 'start_modifier_ordering' AND from_status = 'card_opened' AND to_status = 'awaiting_modifiers') OR (action_code = 'prepare' AND from_status = 'awaiting_modifiers' AND to_status = 'preparing') OR (action_code = 'rebuild' AND from_status = 'preparing' AND to_status = 'awaiting_modifiers') OR (action_code = 'complete_preparation' AND from_status = 'preparing' AND to_status = 'preparation_completed') OR (action_code = 'begin_gameplay' AND from_status IN ('preparing','preparation_completed') AND to_status = 'in_progress') OR (action_code = 'review' AND from_status = 'in_progress' AND to_status = 'reviewing_results') OR (action_code = 'resume_gameplay' AND from_status = 'reviewing_results' AND to_status = 'in_progress') OR (action_code = 'finalize' AND from_status = 'reviewing_results' AND to_status IN ('showing_results','completed')) OR (action_code = 'finish_presentation' AND from_status = 'showing_results' AND to_status = 'completed') OR (action_code = 'technical_cancel' AND from_status IN ('card_opened','awaiting_modifiers','preparing','preparation_completed','in_progress','reviewing_results') AND to_status = 'cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_round_transition_audits_statuses_allowed",
                table: "game_round_transition_audits",
                sql: "(from_status IS NULL OR from_status IN ('card_opened','awaiting_modifiers','preparing','preparation_completed','in_progress','reviewing_results','showing_results','completed','cancelled')) AND to_status IN ('card_opened','awaiting_modifiers','preparing','preparation_completed','in_progress','reviewing_results','showing_results','completed','cancelled')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $migration$
                DECLARE definition text;
                BEGIN
                    SELECT pg_get_functiondef('deadmans_validate_round_update()'::regprocedure) INTO definition;
                    IF strpos(definition, $old$(OLD.status = 'preparing' AND NEW.status IN ('awaiting_modifiers','preparation_completed','cancelled')) OR (OLD.status = 'preparation_completed' AND NEW.status IN ('in_progress','cancelled'))$old$) = 0 THEN
                        RAISE EXCEPTION 'Unexpected round lifecycle guard definition.';
                    END IF;
                    EXECUTE replace(definition, $old$(OLD.status = 'preparing' AND NEW.status IN ('awaiting_modifiers','preparation_completed','cancelled')) OR (OLD.status = 'preparation_completed' AND NEW.status IN ('in_progress','cancelled'))$old$, $new$(OLD.status = 'preparing' AND NEW.status IN ('awaiting_modifiers','in_progress','cancelled'))$new$);
                    SELECT pg_get_functiondef('deadmans_assert_game_finalization(uuid)'::regprocedure) INTO definition;
                    EXECUTE replace(definition, $old$'preparing', 'preparation_completed'$old$, $new$'preparing'$new$);
                END;
                $migration$;
                """);

            migrationBuilder.DropIndex(
                name: "ux_game_rounds_single_nonterminal_game",
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

            migrationBuilder.CreateIndex(
                name: "ux_game_rounds_single_nonterminal_game",
                table: "game_rounds",
                column: "game_id",
                unique: true,
                filter: "status IN ('card_opened','awaiting_modifiers','preparing','in_progress','reviewing_results','showing_results')");

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
    }
}
