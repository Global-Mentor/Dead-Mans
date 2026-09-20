using Microsoft.EntityFrameworkCore.Migrations;

namespace backend.Data.Migrations;

public partial class ConvertQuizToMultipleChoice
{
    private static void ResetPreReleaseQuizData(MigrationBuilder migrationBuilder)
    {
        // This is a one-time, explicitly approved reset of pre-release gameplay data.
        // Existing free-text answers contain no distractors and cannot be converted
        // honestly into multiple-choice questions. Quiz rewards are already linked
        // to modifier purchases and final results, so reset that aggregate together.
        // Keep identities, access/audit, question categories, modifier catalog and media.
        // TRUNCATE handles immutable history and cyclic FKs without disabling triggers.
        // Deliberately no CASCADE: an unexpected dependent table must abort the whole
        // migration, not silently expand its destructive scope. EF runs this and the
        // schema replacement in the same transaction; failure restores the old data.
        migrationBuilder.Sql(
            """
            DO $reset$
            BEGIN
                IF EXISTS (SELECT 1 FROM public.games)
                   OR EXISTS (SELECT 1 FROM public.question_definitions) THEN
                    TRUNCATE TABLE
                        public.game_user_notifications,
                        public.game_team_invitations,
                        public.game_team_members,
                        public.game_team_final_results,
                        public.game_finalizations,
                        public.game_round_transition_audits,
                        public.game_round_cell_media,
                        public.game_round_modifier_results,
                        public.game_round_participants,
                        public.game_quiz_point_ledger_entries,
                        public.game_quiz_correct_answers,
                        public.game_quiz_rounds,
                        public.game_modifier_activations,
                        public.game_rounds,
                        public.game_enabled_modifiers,
                        public.game_enabled_questions,
                        public.game_board_cell_media,
                        public.game_board_cells,
                        public.game_boards,
                        public.game_teams,
                        public.game_team_slots,
                        public.games,
                        public.question_accepted_answers,
                        public.question_definitions
                    RESTRICT;
                END IF;
            END
            $reset$;
            """
        );
    }
}
