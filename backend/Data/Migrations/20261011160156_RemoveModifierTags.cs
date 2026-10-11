using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveModifierTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE OR REPLACE FUNCTION deadmans_validate_modifier_activation_update()
                RETURNS trigger
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                BEGIN
                    IF TG_OP = 'DELETE' THEN
                        RAISE EXCEPTION 'Modifier activation history cannot be deleted.'
                            USING ERRCODE = '55000';
                    END IF;

                    IF ROW(
                        OLD.id, OLD.game_id, OLD.round_id, OLD.modifier_id, OLD.modifier_version_id,
                        OLD.activated_by_user_id, OLD.initiated_by_user_id,
                        OLD.activation_cost_snapshot, OLD.definition_revision_snapshot,
                        OLD.modifier_name_snapshot, OLD.modifier_description_snapshot,
                        OLD.modifier_category_snapshot, OLD.modifier_icon_emoji_snapshot,
                        OLD.activation_command_snapshot,
                        OLD.behavior_v2_snapshot_json, OLD.activated_at_utc
                    ) IS DISTINCT FROM ROW(
                        NEW.id, NEW.game_id, NEW.round_id, NEW.modifier_id, NEW.modifier_version_id,
                        NEW.activated_by_user_id, NEW.initiated_by_user_id,
                        NEW.activation_cost_snapshot, NEW.definition_revision_snapshot,
                        NEW.modifier_name_snapshot, NEW.modifier_description_snapshot,
                        NEW.modifier_category_snapshot, NEW.modifier_icon_emoji_snapshot,
                        NEW.activation_command_snapshot,
                        NEW.behavior_v2_snapshot_json, NEW.activated_at_utc
                    ) THEN
                        RAISE EXCEPTION 'Modifier activation identity and snapshots are immutable.'
                            USING ERRCODE = '55000';
                    END IF;

                    IF OLD.status = 'cancelled'
                       OR (OLD.archived_at_utc IS NOT NULL AND OLD.archived_at_utc IS DISTINCT FROM NEW.archived_at_utc)
                       OR (OLD.status IS DISTINCT FROM NEW.status AND NOT (
                            (OLD.status = 'active' AND NEW.status IN ('consumed', 'cancelled'))
                            OR (OLD.status = 'consumed' AND OLD.archived_at_utc IS NULL AND NEW.status = 'cancelled')
                       )) THEN
                        RAISE EXCEPTION 'Invalid modifier activation lifecycle transition.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_modifier_activations_lifecycle_transition';
                    END IF;

                    RETURN NEW;
                END;
                $$;

                CREATE OR REPLACE FUNCTION deadmans_validate_modifier_result_update()
                RETURNS trigger
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                BEGIN
                    IF TG_OP = 'DELETE' THEN
                        RAISE EXCEPTION 'Modifier result history cannot be deleted.'
                            USING ERRCODE = '55000';
                    END IF;

                    IF OLD.outcome_status <> 'pending' THEN
                        RAISE EXCEPTION 'A resolved modifier result is immutable.'
                            USING ERRCODE = '55000';
                    END IF;

                    IF ROW(
                        OLD.id, OLD.round_id, OLD.modifier_activation_id, OLD.modifier_id,
                        OLD.modifier_name_snapshot, OLD.modifier_category_snapshot,
                        OLD.modifier_description_snapshot, OLD.definition_revision_snapshot,
                        OLD.modifier_activation_command_snapshot,
                        OLD.modifier_behavior_v2_snapshot_json, OLD.created_at_utc
                    ) IS DISTINCT FROM ROW(
                        NEW.id, NEW.round_id, NEW.modifier_activation_id, NEW.modifier_id,
                        NEW.modifier_name_snapshot, NEW.modifier_category_snapshot,
                        NEW.modifier_description_snapshot, NEW.definition_revision_snapshot,
                        NEW.modifier_activation_command_snapshot,
                        NEW.modifier_behavior_v2_snapshot_json, NEW.created_at_utc
                    ) OR NEW.outcome_status = 'pending' THEN
                        RAISE EXCEPTION 'Modifier result snapshots are immutable and may resolve only once.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_round_modifier_results_lifecycle_transition';
                    END IF;

                    RETURN NEW;
                END;
                $$;

                CREATE OR REPLACE FUNCTION deadmans_assert_modifier_activation(p_activation_id uuid)
                RETURNS void
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                DECLARE
                    activation game_modifier_activations%ROWTYPE;
                    purchase_count bigint;
                    refund_count bigint;
                BEGIN
                    SELECT * INTO activation
                    FROM game_modifier_activations
                    WHERE id = p_activation_id;
                    IF NOT FOUND THEN
                        RETURN;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM game_enabled_modifiers enabled
                        WHERE enabled.game_id = activation.game_id
                          AND enabled.modifier_id = activation.modifier_id
                          AND enabled.modifier_version_id = activation.modifier_version_id
                    ) THEN
                        RAISE EXCEPTION 'An activation must use the game-pinned modifier revision.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_modifier_activations_enabled_version';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM game_round_modifier_results result
                        WHERE result.modifier_activation_id = activation.id
                          AND ROW(
                              result.modifier_id,
                              result.definition_revision_snapshot,
                              result.modifier_name_snapshot,
                              result.modifier_description_snapshot,
                              result.modifier_category_snapshot,
                              result.modifier_activation_command_snapshot,
                              result.modifier_behavior_v2_snapshot_json
                          ) IS DISTINCT FROM ROW(
                              activation.modifier_id,
                              activation.definition_revision_snapshot,
                              activation.modifier_name_snapshot,
                              activation.modifier_description_snapshot,
                              activation.modifier_category_snapshot,
                              activation.activation_command_snapshot,
                              activation.behavior_v2_snapshot_json
                          )
                    ) THEN
                        RAISE EXCEPTION 'Modifier result snapshots must match their activation.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_modifier_results_activation_snapshot';
                    END IF;

                    SELECT count(*) FILTER (WHERE entry_type = 'modifier_purchase'),
                           count(*) FILTER (WHERE entry_type = 'modifier_refund')
                    INTO purchase_count, refund_count
                    FROM game_quiz_point_ledger_entries
                    WHERE modifier_activation_id = p_activation_id;

                    IF activation.activation_cost_snapshot > 0 THEN
                        IF purchase_count <> 1 OR NOT EXISTS (
                            SELECT 1 FROM game_quiz_point_ledger_entries purchase
                            WHERE purchase.modifier_activation_id = activation.id
                              AND purchase.entry_type = 'modifier_purchase'
                              AND purchase.game_id = activation.game_id
                              AND purchase.user_id = activation.activated_by_user_id
                              AND purchase.created_by_user_id = activation.initiated_by_user_id
                              AND purchase.points_delta = -activation.activation_cost_snapshot
                              AND purchase.occurred_at_utc = activation.activated_at_utc
                        ) THEN
                            RAISE EXCEPTION 'Paid modifier activation requires its purchase ledger entry.'
                                USING ERRCODE = '23514',
                                      CONSTRAINT = 'ck_modifier_activations_purchase_consistency';
                        END IF;
                    ELSIF purchase_count <> 0 THEN
                        RAISE EXCEPTION 'A free modifier activation cannot have a purchase entry.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_modifier_activations_free_purchase';
                    END IF;

                    IF activation.refund_amount > 0 THEN
                        IF refund_count <> 1 OR NOT EXISTS (
                            SELECT 1 FROM game_quiz_point_ledger_entries refund
                            WHERE refund.modifier_activation_id = activation.id
                              AND refund.entry_type = 'modifier_refund'
                              AND refund.game_id = activation.game_id
                              AND refund.user_id = activation.activated_by_user_id
                              AND refund.created_by_user_id = activation.cancelled_by_user_id
                              AND refund.points_delta = activation.refund_amount
                              AND refund.occurred_at_utc = activation.cancelled_at_utc
                        ) THEN
                            RAISE EXCEPTION 'Refunded modifier activation requires its refund ledger entry.'
                                USING ERRCODE = '23514',
                                      CONSTRAINT = 'ck_modifier_activations_refund_consistency';
                        END IF;
                    ELSIF refund_count <> 0 THEN
                        RAISE EXCEPTION 'A non-refunded modifier activation cannot have a refund entry.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_modifier_activations_unexpected_refund';
                    END IF;
                END;
                $$;
                """
            );

            migrationBuilder.DropColumn(
                name: "normalized_tags",
                table: "modifier_definition_versions");

            migrationBuilder.DropColumn(
                name: "modifier_normalized_tags_snapshot",
                table: "game_round_modifier_results");

            migrationBuilder.DropColumn(
                name: "normalized_tags_snapshot",
                table: "game_modifier_activations");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string[]>(
                name: "normalized_tags",
                table: "modifier_definition_versions",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);

            migrationBuilder.AddColumn<string[]>(
                name: "modifier_normalized_tags_snapshot",
                table: "game_round_modifier_results",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);

            migrationBuilder.AddColumn<string[]>(
                name: "normalized_tags_snapshot",
                table: "game_modifier_activations",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);

            migrationBuilder.Sql(
                """
                CREATE OR REPLACE FUNCTION deadmans_validate_modifier_activation_update()
                RETURNS trigger
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                BEGIN
                    IF TG_OP = 'DELETE' THEN
                        RAISE EXCEPTION 'Modifier activation history cannot be deleted.'
                            USING ERRCODE = '55000';
                    END IF;

                    IF ROW(
                        OLD.id, OLD.game_id, OLD.round_id, OLD.modifier_id, OLD.modifier_version_id,
                        OLD.activated_by_user_id, OLD.initiated_by_user_id,
                        OLD.activation_cost_snapshot, OLD.definition_revision_snapshot,
                        OLD.modifier_name_snapshot, OLD.modifier_description_snapshot,
                        OLD.modifier_category_snapshot, OLD.modifier_icon_emoji_snapshot,
                        OLD.activation_command_snapshot, OLD.normalized_tags_snapshot,
                        OLD.behavior_v2_snapshot_json, OLD.activated_at_utc
                    ) IS DISTINCT FROM ROW(
                        NEW.id, NEW.game_id, NEW.round_id, NEW.modifier_id, NEW.modifier_version_id,
                        NEW.activated_by_user_id, NEW.initiated_by_user_id,
                        NEW.activation_cost_snapshot, NEW.definition_revision_snapshot,
                        NEW.modifier_name_snapshot, NEW.modifier_description_snapshot,
                        NEW.modifier_category_snapshot, NEW.modifier_icon_emoji_snapshot,
                        NEW.activation_command_snapshot, NEW.normalized_tags_snapshot,
                        NEW.behavior_v2_snapshot_json, NEW.activated_at_utc
                    ) THEN
                        RAISE EXCEPTION 'Modifier activation identity and snapshots are immutable.'
                            USING ERRCODE = '55000';
                    END IF;

                    IF OLD.status = 'cancelled'
                       OR (OLD.archived_at_utc IS NOT NULL AND OLD.archived_at_utc IS DISTINCT FROM NEW.archived_at_utc)
                       OR (OLD.status IS DISTINCT FROM NEW.status AND NOT (
                            (OLD.status = 'active' AND NEW.status IN ('consumed', 'cancelled'))
                            OR (OLD.status = 'consumed' AND OLD.archived_at_utc IS NULL AND NEW.status = 'cancelled')
                       )) THEN
                        RAISE EXCEPTION 'Invalid modifier activation lifecycle transition.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_modifier_activations_lifecycle_transition';
                    END IF;

                    RETURN NEW;
                END;
                $$;

                CREATE OR REPLACE FUNCTION deadmans_validate_modifier_result_update()
                RETURNS trigger
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                BEGIN
                    IF TG_OP = 'DELETE' THEN
                        RAISE EXCEPTION 'Modifier result history cannot be deleted.'
                            USING ERRCODE = '55000';
                    END IF;

                    IF OLD.outcome_status <> 'pending' THEN
                        RAISE EXCEPTION 'A resolved modifier result is immutable.'
                            USING ERRCODE = '55000';
                    END IF;

                    IF ROW(
                        OLD.id, OLD.round_id, OLD.modifier_activation_id, OLD.modifier_id,
                        OLD.modifier_name_snapshot, OLD.modifier_category_snapshot,
                        OLD.modifier_description_snapshot, OLD.definition_revision_snapshot,
                        OLD.modifier_activation_command_snapshot, OLD.modifier_normalized_tags_snapshot,
                        OLD.modifier_behavior_v2_snapshot_json, OLD.created_at_utc
                    ) IS DISTINCT FROM ROW(
                        NEW.id, NEW.round_id, NEW.modifier_activation_id, NEW.modifier_id,
                        NEW.modifier_name_snapshot, NEW.modifier_category_snapshot,
                        NEW.modifier_description_snapshot, NEW.definition_revision_snapshot,
                        NEW.modifier_activation_command_snapshot, NEW.modifier_normalized_tags_snapshot,
                        NEW.modifier_behavior_v2_snapshot_json, NEW.created_at_utc
                    ) OR NEW.outcome_status = 'pending' THEN
                        RAISE EXCEPTION 'Modifier result snapshots are immutable and may resolve only once.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_game_round_modifier_results_lifecycle_transition';
                    END IF;

                    RETURN NEW;
                END;
                $$;

                CREATE OR REPLACE FUNCTION deadmans_assert_modifier_activation(p_activation_id uuid)
                RETURNS void
                LANGUAGE plpgsql
                SET search_path = public, pg_temp
                AS $$
                DECLARE
                    activation game_modifier_activations%ROWTYPE;
                    purchase_count bigint;
                    refund_count bigint;
                BEGIN
                    SELECT * INTO activation
                    FROM game_modifier_activations
                    WHERE id = p_activation_id;
                    IF NOT FOUND THEN
                        RETURN;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM game_enabled_modifiers enabled
                        WHERE enabled.game_id = activation.game_id
                          AND enabled.modifier_id = activation.modifier_id
                          AND enabled.modifier_version_id = activation.modifier_version_id
                    ) THEN
                        RAISE EXCEPTION 'An activation must use the game-pinned modifier revision.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_modifier_activations_enabled_version';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM game_round_modifier_results result
                        WHERE result.modifier_activation_id = activation.id
                          AND ROW(
                              result.modifier_id,
                              result.definition_revision_snapshot,
                              result.modifier_name_snapshot,
                              result.modifier_description_snapshot,
                              result.modifier_category_snapshot,
                              result.modifier_activation_command_snapshot,
                              result.modifier_normalized_tags_snapshot,
                              result.modifier_behavior_v2_snapshot_json
                          ) IS DISTINCT FROM ROW(
                              activation.modifier_id,
                              activation.definition_revision_snapshot,
                              activation.modifier_name_snapshot,
                              activation.modifier_description_snapshot,
                              activation.modifier_category_snapshot,
                              activation.activation_command_snapshot,
                              activation.normalized_tags_snapshot,
                              activation.behavior_v2_snapshot_json
                          )
                    ) THEN
                        RAISE EXCEPTION 'Modifier result snapshots must match their activation.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_modifier_results_activation_snapshot';
                    END IF;

                    SELECT count(*) FILTER (WHERE entry_type = 'modifier_purchase'),
                           count(*) FILTER (WHERE entry_type = 'modifier_refund')
                    INTO purchase_count, refund_count
                    FROM game_quiz_point_ledger_entries
                    WHERE modifier_activation_id = p_activation_id;

                    IF activation.activation_cost_snapshot > 0 THEN
                        IF purchase_count <> 1 OR NOT EXISTS (
                            SELECT 1 FROM game_quiz_point_ledger_entries purchase
                            WHERE purchase.modifier_activation_id = activation.id
                              AND purchase.entry_type = 'modifier_purchase'
                              AND purchase.game_id = activation.game_id
                              AND purchase.user_id = activation.activated_by_user_id
                              AND purchase.created_by_user_id = activation.initiated_by_user_id
                              AND purchase.points_delta = -activation.activation_cost_snapshot
                              AND purchase.occurred_at_utc = activation.activated_at_utc
                        ) THEN
                            RAISE EXCEPTION 'Paid modifier activation requires its purchase ledger entry.'
                                USING ERRCODE = '23514',
                                      CONSTRAINT = 'ck_modifier_activations_purchase_consistency';
                        END IF;
                    ELSIF purchase_count <> 0 THEN
                        RAISE EXCEPTION 'A free modifier activation cannot have a purchase entry.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_modifier_activations_free_purchase';
                    END IF;

                    IF activation.refund_amount > 0 THEN
                        IF refund_count <> 1 OR NOT EXISTS (
                            SELECT 1 FROM game_quiz_point_ledger_entries refund
                            WHERE refund.modifier_activation_id = activation.id
                              AND refund.entry_type = 'modifier_refund'
                              AND refund.game_id = activation.game_id
                              AND refund.user_id = activation.activated_by_user_id
                              AND refund.created_by_user_id = activation.cancelled_by_user_id
                              AND refund.points_delta = activation.refund_amount
                              AND refund.occurred_at_utc = activation.cancelled_at_utc
                        ) THEN
                            RAISE EXCEPTION 'Refunded modifier activation requires its refund ledger entry.'
                                USING ERRCODE = '23514',
                                      CONSTRAINT = 'ck_modifier_activations_refund_consistency';
                        END IF;
                    ELSIF refund_count <> 0 THEN
                        RAISE EXCEPTION 'A non-refunded modifier activation cannot have a refund entry.'
                            USING ERRCODE = '23514',
                                  CONSTRAINT = 'ck_modifier_activations_unexpected_refund';
                    END IF;
                END;
                $$;

                ALTER TABLE modifier_definition_versions
                    ADD CONSTRAINT ck_modifier_definition_versions_tags_clean
                    CHECK (deadmans_text_array_is_clean(normalized_tags, 0, 5, 128, TRUE, TRUE));
                ALTER TABLE game_modifier_activations
                    ADD CONSTRAINT ck_game_modifier_activations_tags_clean
                    CHECK (deadmans_text_array_is_clean(normalized_tags_snapshot, 0, 5, 128, TRUE, TRUE));
                ALTER TABLE game_round_modifier_results
                    ADD CONSTRAINT ck_game_round_modifier_results_tags_clean
                    CHECK (deadmans_text_array_is_clean(modifier_normalized_tags_snapshot, 0, 5, 128, TRUE, TRUE));
                """
            );
        }
    }
}
