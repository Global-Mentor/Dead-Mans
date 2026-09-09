using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class ProductionBaseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:citext", ",,")
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,");

            migrationBuilder.CreateTable(
                name: "media_assets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    bucket = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    object_key = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    mime_type = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_media_assets", x => x.id);
                    table.CheckConstraint("ck_media_assets_mime_type_not_blank", "length(trim(mime_type)) > 0");
                    table.CheckConstraint("ck_media_assets_size_positive", "size_bytes > 0");
                    table.CheckConstraint("ck_media_assets_storage_identity_not_blank", "length(trim(bucket)) > 0 AND length(trim(object_key)) > 0");
                });

            migrationBuilder.CreateTable(
                name: "question_categories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "citext", maxLength: 64, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_question_categories", x => x.id);
                    table.CheckConstraint("ck_question_categories_name_not_blank", "length(trim(name)) > 0");
                    table.CheckConstraint("ck_question_categories_timestamps", "updated_at_utc >= created_at_utc");
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<short>(type: "smallint", nullable: false),
                    code = table.Column<string>(type: "citext", maxLength: 32, nullable: false),
                    name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    description = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roles", x => x.id);
                    table.CheckConstraint("ck_roles_identity_not_blank", "length(trim(code)) > 0 AND length(trim(name)) > 0");
                    table.CheckConstraint("ck_roles_timestamps", "updated_at_utc >= created_at_utc");
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    twitch_user_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    login = table.Column<string>(type: "citext", maxLength: 64, nullable: false),
                    display_name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    profile_image_url = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    broadcaster_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    twitch_user_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    last_login_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                    table.CheckConstraint("ck_users_timestamps", "updated_at_utc >= created_at_utc AND (last_login_at_utc IS NULL OR last_login_at_utc >= created_at_utc)");
                    table.CheckConstraint("ck_users_twitch_identity_not_blank", "length(trim(twitch_user_id)) > 0 AND length(trim(login)) > 0 AND length(trim(display_name)) > 0");
                });

            migrationBuilder.CreateTable(
                name: "question_definitions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_code = table.Column<string>(type: "citext", maxLength: 64, nullable: false),
                    category_id = table.Column<Guid>(type: "uuid", nullable: false),
                    text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    reward = table.Column<int>(type: "integer", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    priority = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_question_definitions", x => x.id);
                    table.CheckConstraint("ck_question_definitions_content_not_blank", "length(trim(external_code)) > 0 AND length(trim(text)) > 0");
                    table.CheckConstraint("ck_question_definitions_revision_positive", "revision > 0");
                    table.CheckConstraint("ck_question_definitions_reward_non_negative", "reward >= 0");
                    table.CheckConstraint("ck_question_definitions_soft_delete_semantics", "(is_deleted = FALSE AND deleted_at_utc IS NULL) OR (is_deleted = TRUE AND is_enabled = FALSE AND deleted_at_utc IS NOT NULL)");
                    table.CheckConstraint("ck_question_definitions_timestamps", "updated_at_utc >= created_at_utc AND (deleted_at_utc IS NULL OR deleted_at_utc >= created_at_utc)");
                    table.ForeignKey(
                        name: "fk_question_definitions_question_categories_category_id",
                        column: x => x.category_id,
                        principalTable: "question_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "user_role_audit_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<short>(type: "smallint", nullable: false),
                    changed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_role_audit_events", x => x.id);
                    table.CheckConstraint("ck_user_role_audit_events_action", "action IN ('granted', 'revoked')");
                    table.ForeignKey(
                        name: "fk_user_role_audit_events_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_user_role_audit_events_users_changed_by_user_id",
                        column: x => x.changed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_user_role_audit_events_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "user_roles",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<short>(type: "smallint", nullable: false),
                    assigned_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    assigned_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_roles", x => new { x.user_id, x.role_id });
                    table.CheckConstraint("ck_user_roles_expiry_after_assignment", "expires_at_utc IS NULL OR expires_at_utc > assigned_at_utc");
                    table.ForeignKey(
                        name: "fk_user_roles_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_user_roles_users_assigned_by_user_id",
                        column: x => x.assigned_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_user_roles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "question_accepted_answers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    question_id = table.Column<Guid>(type: "uuid", nullable: false),
                    answer_text = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    normalized_answer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_question_accepted_answers", x => x.id);
                    table.CheckConstraint("ck_question_accepted_answers_sort_order_non_negative", "sort_order >= 0");
                    table.CheckConstraint("ck_question_accepted_answers_text_not_blank", "length(trim(answer_text)) > 0 AND length(trim(normalized_answer)) > 0");
                    table.ForeignKey(
                        name: "fk_question_accepted_answers_question_definitions_question_id",
                        column: x => x.question_id,
                        principalTable: "question_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "game_board_cell_media",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    cell_id = table.Column<Guid>(type: "uuid", nullable: false),
                    media_asset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_board_cell_media", x => x.id);
                    table.CheckConstraint("ck_game_board_cell_media_role_not_blank", "length(trim(role)) > 0");
                    table.CheckConstraint("ck_game_board_cell_media_sort_order_non_negative", "sort_order >= 0");
                    table.ForeignKey(
                        name: "fk_game_board_cell_media_media_assets_media_asset_id",
                        column: x => x.media_asset_id,
                        principalTable: "media_assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "game_board_cells",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    row_index = table.Column<int>(type: "integer", nullable: false),
                    col_index = table.Column<int>(type: "integer", nullable: false),
                    state = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    cell_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    cost = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_board_cells", x => x.id);
                    table.UniqueConstraint("ak_game_board_cells_board_id_id", x => new { x.board_id, x.id });
                    table.CheckConstraint("ck_game_board_cells_coordinates_non_negative", "row_index >= 0 AND col_index >= 0");
                    table.CheckConstraint("ck_game_board_cells_cost_non_negative", "cost >= 0");
                    table.CheckConstraint("ck_game_board_cells_state_allowed", "state IN ('open','closed','cancelled')");
                    table.CheckConstraint("ck_game_board_cells_type_not_blank", "length(trim(cell_type)) > 0");
                });

            migrationBuilder.CreateTable(
                name: "game_boards",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    rows = table.Column<int>(type: "integer", nullable: false),
                    cols = table.Column<int>(type: "integer", nullable: false),
                    row_labels = table.Column<string[]>(type: "text[]", nullable: false),
                    col_labels = table.Column<string[]>(type: "text[]", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_boards", x => x.id);
                    table.UniqueConstraint("ak_game_boards_game_id_id", x => new { x.game_id, x.id });
                    table.CheckConstraint("ck_game_boards_dimensions_positive", "rows BETWEEN 1 AND 20 AND cols BETWEEN 1 AND 12");
                    table.CheckConstraint("ck_game_boards_labels_match_dimensions", "cardinality(row_labels) = rows AND cardinality(col_labels) = cols");
                    table.CheckConstraint("ck_game_boards_version_positive", "version > 0");
                });

            migrationBuilder.CreateTable(
                name: "game_enabled_modifiers",
                columns: table => new
                {
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    modifier_id = table.Column<Guid>(type: "uuid", nullable: false),
                    modifier_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version_pinned_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    enabled_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    emergency_disabled_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    emergency_disabled_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    emergency_disable_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_enabled_modifiers", x => new { x.game_id, x.modifier_id });
                    table.CheckConstraint("ck_game_enabled_modifiers_emergency_disable_audit", "(emergency_disabled_at_utc IS NULL AND emergency_disabled_by_user_id IS NULL AND emergency_disable_reason IS NULL) OR (emergency_disabled_at_utc IS NOT NULL AND emergency_disabled_by_user_id IS NOT NULL AND emergency_disable_reason IS NOT NULL AND length(btrim(emergency_disable_reason)) BETWEEN 1 AND 1000 AND emergency_disabled_at_utc >= enabled_at_utc)");
                    table.CheckConstraint("ck_game_enabled_modifiers_version_pin_pair", "(modifier_version_id IS NULL AND version_pinned_at_utc IS NULL) OR (modifier_version_id IS NOT NULL AND version_pinned_at_utc IS NOT NULL AND version_pinned_at_utc >= enabled_at_utc)");
                    table.ForeignKey(
                        name: "fk_game_enabled_modifiers_users_emergency_disabled_by_user_id",
                        column: x => x.emergency_disabled_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_enabled_questions",
                columns: table => new
                {
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    question_id = table.Column<Guid>(type: "uuid", nullable: false),
                    enabled_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    question_revision_snapshot = table.Column<int>(type: "integer", nullable: false),
                    question_code_snapshot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    category_name_snapshot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    question_text_snapshot = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    accepted_answers_snapshot = table.Column<string[]>(type: "text[]", nullable: false),
                    normalized_answers_snapshot = table.Column<string[]>(type: "text[]", nullable: false),
                    reward_snapshot = table.Column<int>(type: "integer", nullable: false),
                    priority_snapshot = table.Column<int>(type: "integer", nullable: false),
                    snapshot_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_enabled_questions", x => new { x.game_id, x.question_id });
                    table.CheckConstraint("ck_game_enabled_questions_answers_present", "cardinality(accepted_answers_snapshot) > 0 AND cardinality(accepted_answers_snapshot) = cardinality(normalized_answers_snapshot)");
                    table.CheckConstraint("ck_game_enabled_questions_content_not_blank", "length(trim(question_code_snapshot)) > 0 AND length(trim(category_name_snapshot)) > 0 AND length(trim(question_text_snapshot)) > 0");
                    table.CheckConstraint("ck_game_enabled_questions_revision_positive", "question_revision_snapshot > 0");
                    table.CheckConstraint("ck_game_enabled_questions_reward_non_negative", "reward_snapshot >= 0");
                    table.ForeignKey(
                        name: "fk_game_enabled_questions_question_definitions_question_id",
                        column: x => x.question_id,
                        principalTable: "question_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_finalizations",
                columns: table => new
                {
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    finished_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    finished_by_display_name_snapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    finished_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    public_note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    calculation_version = table.Column<int>(type: "integer", nullable: false),
                    completed_round_count = table.Column<int>(type: "integer", nullable: false),
                    cancelled_round_count = table.Column<int>(type: "integer", nullable: false),
                    total_kills = table.Column<int>(type: "integer", nullable: false),
                    total_bounties = table.Column<int>(type: "integer", nullable: false),
                    quiz_total_points = table.Column<int>(type: "integer", nullable: false),
                    skipped_quiz_question_count = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_finalizations", x => x.game_id);
                    table.CheckConstraint("ck_game_finalizations_calculation_version_positive", "calculation_version > 0");
                    table.CheckConstraint("ck_game_finalizations_counts_non_negative", "completed_round_count >= 0 AND cancelled_round_count >= 0 AND total_kills >= 0 AND total_bounties >= 0 AND quiz_total_points >= 0 AND skipped_quiz_question_count >= 0");
                    table.CheckConstraint("ck_game_finalizations_display_name_not_blank", "length(trim(finished_by_display_name_snapshot)) > 0");
                    table.ForeignKey(
                        name: "fk_game_finalizations_users_finished_by_user_id",
                        column: x => x.finished_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_modifier_activations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    round_id = table.Column<Guid>(type: "uuid", nullable: false),
                    modifier_id = table.Column<Guid>(type: "uuid", nullable: false),
                    modifier_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    activated_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    initiated_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    activation_cost_snapshot = table.Column<int>(type: "integer", nullable: false),
                    definition_revision_snapshot = table.Column<int>(type: "integer", nullable: false),
                    modifier_name_snapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    modifier_description_snapshot = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    modifier_category_snapshot = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    modifier_icon_emoji_snapshot = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    activation_command_snapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    normalized_tags_snapshot = table.Column<string[]>(type: "text[]", nullable: false),
                    behavior_v2_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    activated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    archived_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancelled_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    cancelled_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancellation_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    refund_amount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_modifier_activations", x => x.id);
                    table.UniqueConstraint("ak_game_modifier_activations_game_id_id", x => new { x.game_id, x.id });
                    table.UniqueConstraint("ak_game_modifier_activations_round_id_id_modifier_id", x => new { x.round_id, x.id, x.modifier_id });
                    table.CheckConstraint("ck_game_modifier_activations_behavior_v2_schema", "jsonb_typeof(behavior_v2_snapshot_json) = 'object' AND behavior_v2_snapshot_json ->> 'schemaVersion' = '2'");
                    table.CheckConstraint("ck_game_modifier_activations_cost_snapshot_non_negative", "activation_cost_snapshot >= 0");
                    table.CheckConstraint("ck_game_modifier_activations_definition_revision_positive", "definition_revision_snapshot >= 1");
                    table.CheckConstraint("ck_game_modifier_activations_lifecycle_semantics", "(status = 'active' AND archived_at_utc IS NULL AND cancelled_at_utc IS NULL AND cancelled_by_user_id IS NULL AND cancellation_reason IS NULL AND refund_amount = 0) OR (status = 'consumed' AND cancelled_at_utc IS NULL AND cancelled_by_user_id IS NULL AND cancellation_reason IS NULL AND refund_amount = 0) OR (status = 'cancelled' AND archived_at_utc IS NOT NULL AND cancelled_at_utc IS NOT NULL AND cancelled_by_user_id IS NOT NULL AND refund_amount = activation_cost_snapshot)");
                    table.CheckConstraint("ck_game_modifier_activations_refund_range", "refund_amount >= 0 AND refund_amount <= activation_cost_snapshot");
                    table.CheckConstraint("ck_game_modifier_activations_snapshot_not_blank", "length(trim(modifier_name_snapshot)) > 0 AND length(trim(modifier_description_snapshot)) > 0 AND length(trim(modifier_category_snapshot)) > 0");
                    table.CheckConstraint("ck_game_modifier_activations_status_allowed", "status IN ('active','consumed','cancelled')");
                    table.CheckConstraint("ck_game_modifier_activations_timestamp_order", "(archived_at_utc IS NULL OR archived_at_utc >= activated_at_utc) AND (cancelled_at_utc IS NULL OR (cancelled_at_utc >= activated_at_utc AND archived_at_utc = cancelled_at_utc))");
                    table.ForeignKey(
                        name: "fk_game_modifier_activations_enabled_modifier",
                        columns: x => new { x.game_id, x.modifier_id },
                        principalTable: "game_enabled_modifiers",
                        principalColumns: new[] { "game_id", "modifier_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_modifier_activations_users_activated_by_user_id",
                        column: x => x.activated_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_modifier_activations_users_cancelled_by_user_id",
                        column: x => x.cancelled_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_modifier_activations_users_initiated_by_user_id",
                        column: x => x.initiated_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_quiz_correct_answers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quiz_round_id = table.Column<Guid>(type: "uuid", nullable: false),
                    awarded_to_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    captured_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    twitch_user_id_snapshot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    login_snapshot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    display_name_snapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    submitted_answer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    normalized_answer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    source_provider = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    source_channel_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    source_message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    answered_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_quiz_correct_answers", x => x.id);
                    table.UniqueConstraint("ak_game_quiz_correct_answers_game_id_id", x => new { x.game_id, x.id });
                    table.CheckConstraint("ck_game_quiz_correct_answers_answer_not_blank", "length(trim(submitted_answer)) > 0 AND length(trim(normalized_answer)) > 0");
                    table.CheckConstraint("ck_game_quiz_correct_answers_identity_snapshots_not_blank", "length(trim(twitch_user_id_snapshot)) > 0 AND length(trim(login_snapshot)) > 0 AND length(trim(display_name_snapshot)) > 0");
                    table.CheckConstraint("ck_game_quiz_correct_answers_source_allowed", "source_provider IN ('manual','twitch')");
                    table.CheckConstraint("ck_game_quiz_correct_answers_source_semantics", "(source_provider = 'manual' AND source_channel_id IS NULL AND source_message_id IS NULL) OR (source_provider = 'twitch' AND source_channel_id IS NOT NULL AND source_message_id IS NOT NULL AND length(trim(source_channel_id)) > 0 AND length(trim(source_message_id)) > 0)");
                    table.ForeignKey(
                        name: "fk_game_quiz_correct_answers_users_awarded_to_user_id",
                        column: x => x.awarded_to_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_quiz_correct_answers_users_captured_by_user_id",
                        column: x => x.captured_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_quiz_point_ledger_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequence_number = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entry_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    points_delta = table.Column<int>(type: "integer", nullable: false),
                    correct_answer_id = table.Column<Guid>(type: "uuid", nullable: true),
                    modifier_activation_id = table.Column<Guid>(type: "uuid", nullable: true),
                    manual_request_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    available_points_before = table.Column<long>(type: "bigint", nullable: false),
                    available_points_after = table.Column<long>(type: "bigint", nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_quiz_point_ledger_entries", x => x.id);
                    table.CheckConstraint("ck_quiz_point_ledger_balance_audit", "available_points_before >= 0 AND available_points_after >= 0 AND available_points_after = available_points_before + points_delta");
                    table.CheckConstraint("ck_quiz_point_ledger_entry_type_allowed", "entry_type IN ('quiz_reward','manual_adjustment','modifier_purchase','modifier_refund')");
                    table.CheckConstraint("ck_quiz_point_ledger_nonzero_delta", "points_delta <> 0");
                    table.CheckConstraint("ck_quiz_point_ledger_source_semantics", "(entry_type = 'quiz_reward' AND points_delta > 0 AND correct_answer_id IS NOT NULL AND modifier_activation_id IS NULL AND manual_request_id IS NULL AND created_by_user_id IS NULL AND reason IS NULL) OR (entry_type = 'manual_adjustment' AND correct_answer_id IS NULL AND modifier_activation_id IS NULL AND manual_request_id IS NOT NULL AND created_by_user_id IS NOT NULL AND reason IS NOT NULL AND length(trim(reason)) BETWEEN 3 AND 500) OR (entry_type = 'modifier_purchase' AND points_delta < 0 AND correct_answer_id IS NULL AND modifier_activation_id IS NOT NULL AND manual_request_id IS NULL AND created_by_user_id IS NOT NULL AND reason IS NULL) OR (entry_type = 'modifier_refund' AND points_delta > 0 AND correct_answer_id IS NULL AND modifier_activation_id IS NOT NULL AND manual_request_id IS NULL AND created_by_user_id IS NOT NULL AND (reason IS NULL OR length(trim(reason)) BETWEEN 3 AND 500))");
                    table.ForeignKey(
                        name: "fk_game_quiz_point_ledger_entries_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_quiz_point_ledger_entries_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_quiz_point_ledger_correct_answer_same_game",
                        columns: x => new { x.game_id, x.correct_answer_id },
                        principalTable: "game_quiz_correct_answers",
                        principalColumns: new[] { "game_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_quiz_point_ledger_modifier_activation_same_game",
                        columns: x => new { x.game_id, x.modifier_activation_id },
                        principalTable: "game_modifier_activations",
                        principalColumns: new[] { "game_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_quiz_rounds",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    question_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ask_order = table.Column<int>(type: "integer", nullable: false),
                    asked_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    closes_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    closed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    asked_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    question_revision_snapshot = table.Column<int>(type: "integer", nullable: false),
                    question_code_snapshot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    category_name_snapshot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    question_text_snapshot = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    accepted_answers_snapshot = table.Column<string[]>(type: "text[]", nullable: false),
                    normalized_answers_snapshot = table.Column<string[]>(type: "text[]", nullable: false),
                    reward_snapshot = table.Column<int>(type: "integer", nullable: false),
                    delivery_kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    source_channel_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    source_message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_quiz_rounds", x => x.id);
                    table.UniqueConstraint("ak_game_quiz_rounds_game_id_id", x => new { x.game_id, x.id });
                    table.CheckConstraint("ck_game_quiz_rounds_ask_order_positive", "ask_order > 0");
                    table.CheckConstraint("ck_game_quiz_rounds_close_semantics", "((status = 'asked') AND closed_at_utc IS NULL) OR ((status IN ('answered_correct','timeout','skipped')) AND closed_at_utc IS NOT NULL)");
                    table.CheckConstraint("ck_game_quiz_rounds_delivery_kind_allowed", "delivery_kind IN ('manual','twitch')");
                    table.CheckConstraint("ck_game_quiz_rounds_delivery_source_semantics", "(delivery_kind = 'manual' AND source_channel_id IS NULL AND source_message_id IS NULL) OR (delivery_kind = 'twitch' AND source_channel_id IS NOT NULL AND length(trim(source_channel_id)) > 0 AND (source_message_id IS NULL OR length(trim(source_message_id)) > 0))");
                    table.CheckConstraint("ck_game_quiz_rounds_snapshot", "question_revision_snapshot > 0 AND reward_snapshot >= 0 AND length(trim(question_code_snapshot)) > 0 AND length(trim(category_name_snapshot)) > 0 AND length(trim(question_text_snapshot)) > 0 AND cardinality(accepted_answers_snapshot) > 0 AND cardinality(accepted_answers_snapshot) = cardinality(normalized_answers_snapshot)");
                    table.CheckConstraint("ck_game_quiz_rounds_status_allowed", "status IN ('asked','answered_correct','timeout','skipped')");
                    table.CheckConstraint("ck_game_quiz_rounds_window", "closes_at_utc > asked_at_utc AND (closed_at_utc IS NULL OR (closed_at_utc >= asked_at_utc AND closed_at_utc <= closes_at_utc))");
                    table.ForeignKey(
                        name: "fk_game_quiz_rounds_enabled_question",
                        columns: x => new { x.game_id, x.question_id },
                        principalTable: "game_enabled_questions",
                        principalColumns: new[] { "game_id", "question_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_quiz_rounds_question_definitions_question_id",
                        column: x => x.question_id,
                        principalTable: "question_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_quiz_rounds_users_asked_by_user_id",
                        column: x => x.asked_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_round_cell_media",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    round_id = table.Column<Guid>(type: "uuid", nullable: false),
                    bucket = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    object_key = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    mime_type = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_round_cell_media", x => x.id);
                    table.CheckConstraint("ck_game_round_cell_media_mime_type_not_blank", "length(trim(mime_type)) > 0");
                    table.CheckConstraint("ck_game_round_cell_media_role_not_blank", "length(trim(role)) > 0");
                    table.CheckConstraint("ck_game_round_cell_media_size_positive", "size_bytes > 0");
                    table.CheckConstraint("ck_game_round_cell_media_sort_order_non_negative", "sort_order >= 0");
                    table.CheckConstraint("ck_game_round_cell_media_storage_identity_not_blank", "length(trim(bucket)) > 0 AND length(trim(object_key)) > 0");
                });

            migrationBuilder.CreateTable(
                name: "game_round_modifier_results",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    round_id = table.Column<Guid>(type: "uuid", nullable: false),
                    modifier_activation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    modifier_id = table.Column<Guid>(type: "uuid", nullable: false),
                    modifier_name_snapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    modifier_category_snapshot = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    modifier_description_snapshot = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    definition_revision_snapshot = table.Column<int>(type: "integer", nullable: false),
                    modifier_activation_command_snapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    modifier_normalized_tags_snapshot = table.Column<string[]>(type: "text[]", nullable: false),
                    modifier_behavior_v2_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    outcome_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    score_delta = table.Column<int>(type: "integer", nullable: false),
                    kill_delta = table.Column<int>(type: "integer", nullable: false),
                    multiplier_applied = table.Column<decimal>(type: "numeric", nullable: true),
                    resolution_data_json = table.Column<string>(type: "jsonb", nullable: true),
                    resolution_group_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resolution_kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    violation_comment = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    calculation_breakdown_json = table.Column<string>(type: "jsonb", nullable: true),
                    resolved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resolved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_round_modifier_results", x => x.id);
                    table.CheckConstraint("ck_game_round_modifier_results_behavior_v2_schema", "jsonb_typeof(modifier_behavior_v2_snapshot_json) = 'object' AND modifier_behavior_v2_snapshot_json ->> 'schemaVersion' = '2'");
                    table.CheckConstraint("ck_game_round_modifier_results_definition_revision_positive", "definition_revision_snapshot >= 1");
                    table.CheckConstraint("ck_game_round_modifier_results_json_objects", "(resolution_data_json IS NULL OR jsonb_typeof(resolution_data_json) = 'object') AND (calculation_breakdown_json IS NULL OR jsonb_typeof(calculation_breakdown_json) = 'object')");
                    table.CheckConstraint("ck_game_round_modifier_results_resolution_semantics", "((outcome_status = 'pending') AND resolved_at_utc IS NULL AND resolved_by_user_id IS NULL) OR ((outcome_status <> 'pending') AND resolved_at_utc IS NOT NULL AND resolved_by_user_id IS NOT NULL)");
                    table.CheckConstraint("ck_game_round_modifier_results_snapshot_not_blank", "length(trim(modifier_name_snapshot)) > 0 AND length(trim(modifier_description_snapshot)) > 0 AND length(trim(modifier_category_snapshot)) > 0");
                    table.CheckConstraint("ck_game_round_modifier_results_status_allowed", "outcome_status IN ('pending','completed','failed','cancelled','violated','not_triggered','succeeded','not_succeeded','calculated')");
                    table.ForeignKey(
                        name: "fk_game_round_modifier_results_users_resolved_by_user_id",
                        column: x => x.resolved_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_modifier_results_activation_same_round_modifier",
                        columns: x => new { x.round_id, x.modifier_activation_id, x.modifier_id },
                        principalTable: "game_modifier_activations",
                        principalColumns: new[] { "round_id", "id", "modifier_id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_round_participants",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    round_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    display_name_snapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_round_participants", x => x.id);
                    table.CheckConstraint("ck_game_round_participants_display_name_not_blank", "length(trim(display_name_snapshot)) > 0");
                    table.ForeignKey(
                        name: "fk_game_round_participants_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_round_transition_audits",
                columns: table => new
                {
                    round_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequence = table.Column<int>(type: "integer", nullable: false),
                    from_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    to_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    action_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    initiated_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    resulting_round_version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_round_transition_audits", x => new { x.round_id, x.sequence });
                    table.CheckConstraint("ck_game_round_transition_audits_action_allowed", "action_code IN ('prepare','rebuild','begin_gameplay','review','resume_gameplay','finalize','technical_cancel')");
                    table.CheckConstraint("ck_game_round_transition_audits_action_semantics", "(action_code = 'prepare' AND from_status = 'awaiting_modifiers' AND to_status = 'preparing') OR (action_code = 'rebuild' AND from_status = 'preparing' AND to_status = 'awaiting_modifiers') OR (action_code = 'begin_gameplay' AND from_status IN ('awaiting_modifiers','preparing') AND to_status = 'in_progress') OR (action_code = 'review' AND from_status = 'in_progress' AND to_status = 'reviewing_results') OR (action_code = 'resume_gameplay' AND from_status = 'reviewing_results' AND to_status = 'in_progress') OR (action_code = 'finalize' AND from_status = 'reviewing_results' AND to_status = 'completed') OR (action_code = 'technical_cancel' AND from_status IN ('awaiting_modifiers','preparing','in_progress','reviewing_results') AND to_status = 'cancelled')");
                    table.CheckConstraint("ck_game_round_transition_audits_resulting_version_positive", "resulting_round_version > 0");
                    table.CheckConstraint("ck_game_round_transition_audits_sequence_positive", "sequence > 0");
                    table.CheckConstraint("ck_game_round_transition_audits_statuses_allowed", "(from_status IS NULL OR from_status IN ('awaiting_modifiers','preparing','in_progress','reviewing_results','completed','cancelled')) AND to_status IN ('awaiting_modifiers','preparing','in_progress','reviewing_results','completed','cancelled')");
                    table.ForeignKey(
                        name: "fk_game_round_transition_audits_users_initiated_by_user_id",
                        column: x => x.initiated_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_rounds",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_cell_id = table.Column<Guid>(type: "uuid", nullable: false),
                    team_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    prepared_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    gameplay_started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reviewed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    finished_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    base_score = table.Column<int>(type: "integer", nullable: false),
                    final_score = table.Column<int>(type: "integer", nullable: true),
                    empty_card_penalty_applied = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    kills_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    bounty_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    team_slot_index_snapshot = table.Column<int>(type: "integer", nullable: false),
                    cell_row_index = table.Column<int>(type: "integer", nullable: false),
                    cell_col_index = table.Column<int>(type: "integer", nullable: false),
                    cell_title_snapshot = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    cell_description_snapshot = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    cell_cost_snapshot = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    technical_cancellation_reason_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    public_cancellation_summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    internal_cancellation_detail = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    resolved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_rounds", x => x.id);
                    table.UniqueConstraint("ak_game_rounds_game_id_id", x => new { x.game_id, x.id });
                    table.CheckConstraint("ck_game_rounds_base_score_non_negative", "base_score >= 0");
                    table.CheckConstraint("ck_game_rounds_bounty_count_non_negative", "bounty_count >= 0");
                    table.CheckConstraint("ck_game_rounds_cell_cost_non_negative", "cell_cost_snapshot >= 0");
                    table.CheckConstraint("ck_game_rounds_empty_card_penalty_semantics", "(empty_card_penalty_applied = false) OR (status = 'completed' AND final_score IS NOT NULL)");
                    table.CheckConstraint("ck_game_rounds_finished_at_semantics", "((status IN ('awaiting_modifiers','preparing','in_progress','reviewing_results')) AND finished_at_utc IS NULL) OR ((status IN ('completed','cancelled')) AND finished_at_utc IS NOT NULL)");
                    table.CheckConstraint("ck_game_rounds_kills_count_non_negative", "kills_count >= 0");
                    table.CheckConstraint("ck_game_rounds_lifecycle_timestamps", "(status = 'awaiting_modifiers' AND prepared_at_utc IS NULL AND gameplay_started_at_utc IS NULL AND reviewed_at_utc IS NULL) OR (status = 'preparing' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NULL AND reviewed_at_utc IS NULL) OR (status = 'in_progress' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc IS NULL) OR (status = 'reviewing_results' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc IS NOT NULL) OR (status = 'completed' AND prepared_at_utc IS NOT NULL AND gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc IS NOT NULL) OR (status = 'cancelled')");
                    table.CheckConstraint("ck_game_rounds_resolution_semantics", "((status IN ('awaiting_modifiers','preparing','in_progress','reviewing_results')) AND final_score IS NULL AND resolved_by_user_id IS NULL) OR ((status = 'completed') AND final_score IS NOT NULL AND resolved_by_user_id IS NOT NULL) OR ((status = 'cancelled') AND final_score = 0 AND resolved_by_user_id IS NOT NULL)");
                    table.CheckConstraint("ck_game_rounds_row_col_non_negative", "cell_row_index >= 0 AND cell_col_index >= 0");
                    table.CheckConstraint("ck_game_rounds_status_allowed", "status IN ('awaiting_modifiers','preparing','in_progress','reviewing_results','completed','cancelled')");
                    table.CheckConstraint("ck_game_rounds_team_slot_positive", "team_slot_index_snapshot > 0");
                    table.CheckConstraint("ck_game_rounds_technical_cancellation_reason_allowed", "technical_cancellation_reason_code IS NULL OR technical_cancellation_reason_code IN ('external_game_failure','stream_or_infrastructure_failure','application_error','operator_error','other')");
                    table.CheckConstraint("ck_game_rounds_technical_cancellation_semantics", "(status = 'cancelled' AND technical_cancellation_reason_code IS NOT NULL AND internal_cancellation_detail IS NOT NULL AND (technical_cancellation_reason_code <> 'other' OR public_cancellation_summary IS NOT NULL)) OR (status <> 'cancelled' AND technical_cancellation_reason_code IS NULL AND public_cancellation_summary IS NULL AND internal_cancellation_detail IS NULL)");
                    table.CheckConstraint("ck_game_rounds_timestamp_order", "(prepared_at_utc IS NULL OR prepared_at_utc >= created_at_utc) AND (gameplay_started_at_utc IS NULL OR (prepared_at_utc IS NOT NULL AND gameplay_started_at_utc >= prepared_at_utc)) AND (reviewed_at_utc IS NULL OR (gameplay_started_at_utc IS NOT NULL AND reviewed_at_utc >= gameplay_started_at_utc)) AND (finished_at_utc IS NULL OR finished_at_utc >= created_at_utc) AND (finished_at_utc IS NULL OR prepared_at_utc IS NULL OR finished_at_utc >= prepared_at_utc) AND (finished_at_utc IS NULL OR gameplay_started_at_utc IS NULL OR finished_at_utc >= gameplay_started_at_utc) AND (finished_at_utc IS NULL OR reviewed_at_utc IS NULL OR finished_at_utc >= reviewed_at_utc) AND updated_at_utc >= created_at_utc");
                    table.CheckConstraint("ck_game_rounds_version_positive", "version > 0");
                    table.ForeignKey(
                        name: "fk_game_rounds_board_cells_same_board",
                        columns: x => new { x.board_id, x.board_cell_id },
                        principalTable: "game_board_cells",
                        principalColumns: new[] { "board_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_rounds_game_boards_same_game",
                        columns: x => new { x.game_id, x.board_id },
                        principalTable: "game_boards",
                        principalColumns: new[] { "game_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_rounds_users_resolved_by_user_id",
                        column: x => x.resolved_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_team_final_results",
                columns: table => new
                {
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    team_id = table.Column<Guid>(type: "uuid", nullable: false),
                    team_name_snapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    team_slot_index_snapshot = table.Column<int>(type: "integer", nullable: false),
                    participant_names_snapshot = table.Column<string[]>(type: "text[]", nullable: false),
                    rounds_played = table.Column<int>(type: "integer", nullable: false),
                    best_score = table.Column<int>(type: "integer", nullable: true),
                    penalty_total = table.Column<int>(type: "integer", nullable: false),
                    final_score = table.Column<int>(type: "integer", nullable: true),
                    total_score = table.Column<int>(type: "integer", nullable: false),
                    total_bonus_delta = table.Column<int>(type: "integer", nullable: false),
                    total_kills = table.Column<int>(type: "integer", nullable: false),
                    total_bounties = table.Column<int>(type: "integer", nullable: false),
                    placement = table.Column<int>(type: "integer", nullable: true),
                    last_finished_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_team_final_results", x => new { x.game_id, x.team_id });
                    table.CheckConstraint("ck_game_team_final_results_rounds_non_negative", "rounds_played >= 0 AND penalty_total >= 0 AND total_kills >= 0 AND total_bounties >= 0");
                    table.CheckConstraint("ck_game_team_final_results_team_slot_positive", "team_slot_index_snapshot > 0");
                    table.CheckConstraint("ck_game_team_final_results_unplayed_semantics", "(rounds_played = 0 AND best_score IS NULL AND final_score IS NULL AND placement IS NULL AND last_finished_at_utc IS NULL) OR (rounds_played > 0 AND best_score IS NOT NULL AND final_score IS NOT NULL AND placement IS NOT NULL AND placement > 0 AND last_finished_at_utc IS NOT NULL)");
                    table.ForeignKey(
                        name: "fk_game_team_final_results_game_finalizations_game_id",
                        column: x => x.game_id,
                        principalTable: "game_finalizations",
                        principalColumn: "game_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "game_team_invitations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    team_id = table.Column<Guid>(type: "uuid", nullable: true),
                    invited_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    invited_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    invited_by_kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    responded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_team_invitations", x => x.id);
                    table.CheckConstraint("ck_game_team_invitations_invited_by_kind", "invited_by_kind IN ('admin','member')");
                    table.CheckConstraint("ck_game_team_invitations_response_timestamp_semantics", "((status = 'pending') AND responded_at_utc IS NULL) OR ((status <> 'pending') AND responded_at_utc IS NOT NULL AND responded_at_utc >= created_at_utc)");
                    table.CheckConstraint("ck_game_team_invitations_source_team_semantics", "invited_by_kind = 'admin' OR team_id IS NOT NULL");
                    table.CheckConstraint("ck_game_team_invitations_status", "status IN ('pending','accepted','declined','cancelled','expired')");
                    table.ForeignKey(
                        name: "fk_game_team_invitations_users_invited_by_user_id",
                        column: x => x.invited_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_team_invitations_users_invited_user_id",
                        column: x => x.invited_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_team_members",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    team_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    joined_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    left_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_team_members", x => x.id);
                    table.CheckConstraint("ck_game_team_members_left_after_join", "left_at_utc IS NULL OR left_at_utc >= joined_at_utc");
                    table.ForeignKey(
                        name: "fk_game_team_members_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_team_slots",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    slot_index = table.Column<int>(type: "integer", nullable: false),
                    slot_type = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    reserved_label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_team_slots", x => x.id);
                    table.UniqueConstraint("ak_game_team_slots_game_id_id", x => new { x.game_id, x.id });
                    table.CheckConstraint("ck_game_team_slots_reserved_label_semantics", "(slot_type = 'public' AND reserved_label IS NULL) OR (slot_type = 'reserved' AND reserved_label IS NOT NULL AND length(trim(reserved_label)) > 0)");
                    table.CheckConstraint("ck_game_team_slots_slot_index_positive", "slot_index > 0");
                    table.CheckConstraint("ck_game_team_slots_slot_type", "slot_type IN ('public','reserved')");
                });

            migrationBuilder.CreateTable(
                name: "game_teams",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(48)", maxLength: 48, nullable: true),
                    recruitment_open = table.Column<bool>(type: "boolean", nullable: false),
                    is_played = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    played_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    confirmed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    confirmed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    rejected_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    rejected_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    disbanded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    disbanded_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    disband_requested_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    disband_requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_teams", x => x.id);
                    table.UniqueConstraint("ak_game_teams_game_id_id", x => new { x.game_id, x.id });
                    table.CheckConstraint("ck_game_teams_content_and_timestamps", "(name IS NULL OR length(trim(name)) > 0) AND updated_at_utc >= created_at_utc AND (played_at_utc IS NULL OR played_at_utc >= created_at_utc) AND (confirmed_at_utc IS NULL OR confirmed_at_utc >= created_at_utc) AND (rejected_at_utc IS NULL OR rejected_at_utc >= created_at_utc) AND (disbanded_at_utc IS NULL OR disbanded_at_utc >= created_at_utc) AND (disband_requested_at_utc IS NULL OR disband_requested_at_utc >= created_at_utc)");
                    table.CheckConstraint("ck_game_teams_disband_request_user_pair", "(disband_requested_at_utc IS NULL AND disband_requested_by_user_id IS NULL) OR (disband_requested_at_utc IS NOT NULL AND disband_requested_by_user_id IS NOT NULL)");
                    table.CheckConstraint("ck_game_teams_played_timestamp_semantics", "(is_played = true AND played_at_utc IS NOT NULL) OR (is_played = false AND played_at_utc IS NULL)");
                    table.CheckConstraint("ck_game_teams_status_allowed", "status IN ('forming','confirmed','rejected','disbanded')");
                    table.CheckConstraint("ck_game_teams_status_timestamp_semantics", "((status = 'forming') AND confirmed_at_utc IS NULL AND rejected_at_utc IS NULL AND disbanded_at_utc IS NULL AND disband_requested_at_utc IS NULL) OR ((status = 'confirmed') AND confirmed_at_utc IS NOT NULL AND confirmed_by_user_id IS NOT NULL AND rejected_at_utc IS NULL AND disbanded_at_utc IS NULL) OR ((status = 'rejected') AND rejected_at_utc IS NOT NULL AND rejected_by_user_id IS NOT NULL AND disbanded_at_utc IS NULL AND disband_requested_at_utc IS NULL) OR ((status = 'disbanded') AND disbanded_at_utc IS NOT NULL AND disbanded_by_user_id IS NOT NULL AND disband_requested_at_utc IS NULL)");
                    table.CheckConstraint("ck_game_teams_terminal_recruitment_closed", "status NOT IN ('rejected','disbanded') OR recruitment_open = FALSE");
                    table.ForeignKey(
                        name: "fk_game_teams_game_team_slots_game_id_slot_id",
                        columns: x => new { x.game_id, x.slot_id },
                        principalTable: "game_team_slots",
                        principalColumns: new[] { "game_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_teams_users_confirmed_by_user_id",
                        column: x => x.confirmed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_teams_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_game_teams_users_disband_requested_by_user_id",
                        column: x => x.disband_requested_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_teams_users_disbanded_by_user_id",
                        column: x => x.disbanded_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_teams_users_rejected_by_user_id",
                        column: x => x.rejected_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "games",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ready_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    finished_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    min_players_per_team = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)1),
                    max_players_per_team = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)2),
                    quiz_answer_duration_seconds = table.Column<int>(type: "integer", nullable: false, defaultValue: 60),
                    active_team_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_games", x => x.id);
                    table.CheckConstraint("ck_games_active_team_requires_active_game", "(active_team_id IS NULL) OR (status = 'active' AND is_deleted = FALSE)");
                    table.CheckConstraint("ck_games_finished_at_semantics", "((status IN ('draft','ready','active')) AND finished_at_utc IS NULL) OR ((status = 'finished') AND finished_at_utc IS NOT NULL)");
                    table.CheckConstraint("ck_games_lifecycle_timestamps", "((status = 'draft') AND ready_at_utc IS NULL AND started_at_utc IS NULL AND finished_at_utc IS NULL) OR ((status = 'ready') AND ready_at_utc IS NOT NULL AND started_at_utc IS NULL AND finished_at_utc IS NULL) OR ((status = 'active') AND ready_at_utc IS NOT NULL AND started_at_utc IS NOT NULL AND finished_at_utc IS NULL) OR ((status = 'finished') AND ready_at_utc IS NOT NULL AND started_at_utc IS NOT NULL AND finished_at_utc IS NOT NULL)");
                    table.CheckConstraint("ck_games_quiz_answer_duration", "quiz_answer_duration_seconds BETWEEN 5 AND 3600");
                    table.CheckConstraint("ck_games_soft_delete_semantics", "(is_deleted = FALSE AND deleted_at_utc IS NULL) OR (is_deleted = TRUE AND deleted_at_utc IS NOT NULL)");
                    table.CheckConstraint("ck_games_status_allowed", "status IN ('draft','ready','active','finished')");
                    table.CheckConstraint("ck_games_team_size_limits", "min_players_per_team > 0 AND max_players_per_team >= min_players_per_team");
                    table.CheckConstraint("ck_games_timestamp_order", "(ready_at_utc IS NULL OR ready_at_utc >= created_at_utc) AND (started_at_utc IS NULL OR started_at_utc >= ready_at_utc) AND (finished_at_utc IS NULL OR finished_at_utc >= started_at_utc) AND (deleted_at_utc IS NULL OR deleted_at_utc >= created_at_utc)");
                    table.CheckConstraint("ck_games_title_not_blank", "length(trim(title)) > 0");
                    table.ForeignKey(
                        name: "fk_games_active_team_same_game",
                        columns: x => new { x.id, x.active_team_id },
                        principalTable: "game_teams",
                        principalColumns: new[] { "game_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_user_notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    schema_version = table.Column<int>(type: "integer", nullable: false),
                    payload_json = table.Column<string>(type: "jsonb", nullable: false),
                    deduplication_key = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    read_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_user_notifications", x => x.id);
                    table.CheckConstraint("ck_game_user_notifications_identity_not_blank", "length(trim(type)) > 0 AND length(trim(deduplication_key)) > 0");
                    table.CheckConstraint("ck_game_user_notifications_modifier_cancelled_v1_payload", "type <> 'modifier_cancelled' OR (schema_version = 1 AND jsonb_typeof(payload_json -> 'modifierActivationId') = 'string' AND length(trim(payload_json ->> 'modifierActivationId')) > 0 AND jsonb_typeof(payload_json -> 'modifierName') = 'string' AND length(trim(payload_json ->> 'modifierName')) > 0 AND jsonb_typeof(payload_json -> 'actorDisplayName') = 'string' AND length(trim(payload_json ->> 'actorDisplayName')) > 0 AND jsonb_typeof(payload_json -> 'quizPointsDelta') = 'number' AND (payload_json ->> 'quizPointsDelta')::integer >= 0)");
                    table.CheckConstraint("ck_game_user_notifications_payload_envelope", "schema_version > 0 AND jsonb_typeof(payload_json) = 'object'");
                    table.CheckConstraint("ck_game_user_notifications_read_after_create", "read_at_utc IS NULL OR read_at_utc >= created_at_utc");
                    table.ForeignKey(
                        name: "fk_game_user_notifications_games_game_id",
                        column: x => x.game_id,
                        principalTable: "games",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_user_notifications_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "modifier_definition_version_conflicts",
                columns: table => new
                {
                    modifier_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    conflicting_modifier_id = table.Column<Guid>(type: "uuid", nullable: false),
                    conflicting_modifier_name_snapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_modifier_definition_version_conflicts", x => new { x.modifier_version_id, x.conflicting_modifier_id });
                    table.CheckConstraint("ck_modifier_definition_version_conflicts_name_not_blank", "length(trim(conflicting_modifier_name_snapshot)) > 0");
                });

            migrationBuilder.CreateTable(
                name: "modifier_definition_versions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    modifier_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    category = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    icon_emoji = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    activation_command = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    activation_cost = table.Column<int>(type: "integer", nullable: false),
                    max_activations_per_round = table.Column<int>(type: "integer", nullable: true),
                    normalized_tags = table.Column<string[]>(type: "text[]", nullable: false),
                    behavior_v2_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_by_display_name_snapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    change_note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    change_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    changed_fields = table.Column<string[]>(type: "text[]", nullable: false),
                    cascade_source_modifier_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_modifier_definition_versions", x => x.id);
                    table.UniqueConstraint("ak_modifier_definition_versions_modifier_id_id", x => new { x.modifier_id, x.id });
                    table.CheckConstraint("ck_modifier_definition_versions_behavior_v2_schema", "jsonb_typeof(behavior_v2_json) = 'object' AND behavior_v2_json ->> 'schemaVersion' = '2'");
                    table.CheckConstraint("ck_modifier_definition_versions_category_allowed", "category IN ('preparation','round','result')");
                    table.CheckConstraint("ck_modifier_definition_versions_change_note", "change_note IS NULL OR length(btrim(change_note)) BETWEEN 1 AND 500");
                    table.CheckConstraint("ck_modifier_definition_versions_change_type", "change_type IN ('created','edited','compatibility_cascade','migration_baseline')");
                    table.CheckConstraint("ck_modifier_definition_versions_content_not_blank", "length(btrim(name)) > 0 AND length(btrim(description)) > 0 AND length(btrim(created_by_display_name_snapshot)) > 0");
                    table.CheckConstraint("ck_modifier_definition_versions_cost_non_negative", "activation_cost >= 0");
                    table.CheckConstraint("ck_modifier_definition_versions_limit_positive_or_null", "max_activations_per_round IS NULL OR max_activations_per_round > 0");
                    table.CheckConstraint("ck_modifier_definition_versions_revision_positive", "revision >= 1");
                    table.ForeignKey(
                        name: "fk_modifier_definition_versions_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "modifier_definitions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    current_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_archived = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    archived_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    archived_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_modifier_definitions", x => x.id);
                    table.CheckConstraint("ck_modifier_definitions_archive_semantics", "(is_archived = FALSE AND archived_at_utc IS NULL AND archived_by_user_id IS NULL) OR (is_archived = TRUE AND archived_at_utc IS NOT NULL AND archived_by_user_id IS NOT NULL AND archived_at_utc >= created_at_utc)");
                    table.ForeignKey(
                        name: "fk_modifier_definitions_current_version",
                        columns: x => new { x.id, x.current_version_id },
                        principalTable: "modifier_definition_versions",
                        principalColumns: new[] { "modifier_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_modifier_definitions_users_archived_by_user_id",
                        column: x => x.archived_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_modifier_definitions_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "roles",
                columns: new[] { "id", "code", "created_at_utc", "description", "name", "updated_at_utc" },
                values: new object[,]
                {
                    { (short)1, "viewer", new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc), "Viewer role with basic registration capabilities.", "Viewer", new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { (short)2, "moderator", new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc), "Moderator role that helps manage game operations.", "Moderator", new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { (short)3, "admin", new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc), "Administrator role with full management access.", "Administrator", new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { (short)4, "superadmin", new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc), "Owner role with access to application role management.", "Super administrator", new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.CreateIndex(
                name: "ix_game_board_cell_media_cell_id_sort_order",
                table: "game_board_cell_media",
                columns: new[] { "cell_id", "sort_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_board_cell_media_media_asset_id",
                table: "game_board_cell_media",
                column: "media_asset_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_board_cells_board_id_row_index_col_index",
                table: "game_board_cells",
                columns: new[] { "board_id", "row_index", "col_index" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_board_cells_state",
                table: "game_board_cells",
                column: "state");

            migrationBuilder.CreateIndex(
                name: "ix_game_boards_game_id",
                table: "game_boards",
                column: "game_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_enabled_modifiers_emergency_disabled_by_user_id",
                table: "game_enabled_modifiers",
                column: "emergency_disabled_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_enabled_modifiers_modifier_id_modifier_version_id",
                table: "game_enabled_modifiers",
                columns: new[] { "modifier_id", "modifier_version_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_enabled_modifiers_modifier_version_id_game_id",
                table: "game_enabled_modifiers",
                columns: new[] { "modifier_version_id", "game_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_enabled_questions_question_id",
                table: "game_enabled_questions",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_finalizations_finished_by_user_id",
                table: "game_finalizations",
                column: "finished_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_finalizations_request_id",
                table: "game_finalizations",
                column: "request_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_modifier_activations_cancelled_by_user_id",
                table: "game_modifier_activations",
                column: "cancelled_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_modifier_activations_game_activated",
                table: "game_modifier_activations",
                columns: new[] { "game_id", "activated_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_game_modifier_activations_game_archived",
                table: "game_modifier_activations",
                columns: new[] { "game_id", "archived_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_game_modifier_activations_game_id_round_id",
                table: "game_modifier_activations",
                columns: new[] { "game_id", "round_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_modifier_activations_game_modifier",
                table: "game_modifier_activations",
                columns: new[] { "game_id", "modifier_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_modifier_activations_initiated_by_user_id",
                table: "game_modifier_activations",
                column: "initiated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_modifier_activations_modifier_id_modifier_version_id",
                table: "game_modifier_activations",
                columns: new[] { "modifier_id", "modifier_version_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_modifier_activations_round_status_activated",
                table: "game_modifier_activations",
                columns: new[] { "round_id", "status", "activated_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_game_modifier_activations_user_activated",
                table: "game_modifier_activations",
                columns: new[] { "activated_by_user_id", "activated_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_game_modifier_activations_version_game",
                table: "game_modifier_activations",
                columns: new[] { "modifier_version_id", "game_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_correct_answers_awarded_to_user_id",
                table: "game_quiz_correct_answers",
                column: "awarded_to_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_correct_answers_captured_by_user_id",
                table: "game_quiz_correct_answers",
                column: "captured_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_correct_answers_game_id_quiz_round_id",
                table: "game_quiz_correct_answers",
                columns: new[] { "game_id", "quiz_round_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_correct_answers_quiz_round_id",
                table: "game_quiz_correct_answers",
                column: "quiz_round_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_quiz_answers_game_user_time",
                table: "game_quiz_correct_answers",
                columns: new[] { "game_id", "awarded_to_user_id", "answered_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ux_game_quiz_correct_answers_source_message",
                table: "game_quiz_correct_answers",
                columns: new[] { "source_provider", "source_channel_id", "source_message_id" },
                unique: true,
                filter: "source_channel_id IS NOT NULL AND source_message_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_point_ledger_entries_correct_answer_id",
                table: "game_quiz_point_ledger_entries",
                column: "correct_answer_id",
                unique: true,
                filter: "correct_answer_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_point_ledger_entries_created_by_user_id",
                table: "game_quiz_point_ledger_entries",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_point_ledger_entries_game_id_correct_answer_id",
                table: "game_quiz_point_ledger_entries",
                columns: new[] { "game_id", "correct_answer_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_point_ledger_entries_manual_request_id",
                table: "game_quiz_point_ledger_entries",
                column: "manual_request_id",
                unique: true,
                filter: "manual_request_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_point_ledger_entries_sequence_number",
                table: "game_quiz_point_ledger_entries",
                column: "sequence_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_point_ledger_entries_user_id_game_id",
                table: "game_quiz_point_ledger_entries",
                columns: new[] { "user_id", "game_id" });

            migrationBuilder.CreateIndex(
                name: "ix_quiz_ledger_game_activation",
                table: "game_quiz_point_ledger_entries",
                columns: new[] { "game_id", "modifier_activation_id" });

            migrationBuilder.CreateIndex(
                name: "ix_quiz_ledger_game_user_sequence",
                table: "game_quiz_point_ledger_entries",
                columns: new[] { "game_id", "user_id", "sequence_number" });

            migrationBuilder.CreateIndex(
                name: "ux_quiz_point_ledger_modifier_event",
                table: "game_quiz_point_ledger_entries",
                columns: new[] { "modifier_activation_id", "entry_type" },
                unique: true,
                filter: "modifier_activation_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_rounds_asked_by_user_id_asked_at_utc",
                table: "game_quiz_rounds",
                columns: new[] { "asked_by_user_id", "asked_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_rounds_game_id_ask_order",
                table: "game_quiz_rounds",
                columns: new[] { "game_id", "ask_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_rounds_game_id_asked_at_utc",
                table: "game_quiz_rounds",
                columns: new[] { "game_id", "asked_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_rounds_game_id_question_id",
                table: "game_quiz_rounds",
                columns: new[] { "game_id", "question_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_rounds_game_id_status",
                table: "game_quiz_rounds",
                columns: new[] { "game_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_game_quiz_rounds_question_id",
                table: "game_quiz_rounds",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "ux_game_quiz_rounds_one_open",
                table: "game_quiz_rounds",
                column: "game_id",
                unique: true,
                filter: "status = 'asked'");

            migrationBuilder.CreateIndex(
                name: "ux_game_round_cell_media_round_sort_order",
                table: "game_round_cell_media",
                columns: new[] { "round_id", "sort_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_round_modifier_results_modifier_status",
                table: "game_round_modifier_results",
                columns: new[] { "modifier_id", "outcome_status" });

            migrationBuilder.CreateIndex(
                name: "ix_game_round_modifier_results_resolved_by_user_id",
                table: "game_round_modifier_results",
                column: "resolved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_round_modifier_results_round_status",
                table: "game_round_modifier_results",
                columns: new[] { "round_id", "outcome_status" });

            migrationBuilder.CreateIndex(
                name: "ix_round_modifier_results_activation_fk",
                table: "game_round_modifier_results",
                columns: new[] { "round_id", "modifier_activation_id", "modifier_id" });

            migrationBuilder.CreateIndex(
                name: "ux_game_round_modifier_results_round_activation",
                table: "game_round_modifier_results",
                columns: new[] { "round_id", "modifier_activation_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_round_participants_user_created",
                table: "game_round_participants",
                columns: new[] { "user_id", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ux_game_round_participants_round_user",
                table: "game_round_participants",
                columns: new[] { "round_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_round_transition_audits_initiated_by_user_id",
                table: "game_round_transition_audits",
                column: "initiated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ux_round_transition_version",
                table: "game_round_transition_audits",
                columns: new[] { "round_id", "resulting_round_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_rounds_board_cell_id_created_at_utc",
                table: "game_rounds",
                columns: new[] { "board_cell_id", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_game_rounds_board_id_board_cell_id",
                table: "game_rounds",
                columns: new[] { "board_id", "board_cell_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_rounds_game_id_board_id",
                table: "game_rounds",
                columns: new[] { "game_id", "board_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_rounds_game_id_created_at_utc",
                table: "game_rounds",
                columns: new[] { "game_id", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_game_rounds_game_id_team_id_board_cell_id_created_at_utc",
                table: "game_rounds",
                columns: new[] { "game_id", "team_id", "board_cell_id", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_game_rounds_resolved_by_user_id",
                table: "game_rounds",
                column: "resolved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_rounds_team_id_created_at_utc",
                table: "game_rounds",
                columns: new[] { "team_id", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ux_game_rounds_one_effective_cell",
                table: "game_rounds",
                columns: new[] { "game_id", "board_cell_id" },
                unique: true,
                filter: "status <> 'cancelled'");

            migrationBuilder.CreateIndex(
                name: "ux_game_rounds_single_nonterminal_game",
                table: "game_rounds",
                column: "game_id",
                unique: true,
                filter: "status IN ('awaiting_modifiers','preparing','in_progress','reviewing_results')");

            migrationBuilder.CreateIndex(
                name: "ix_game_team_final_results_game_id_placement",
                table: "game_team_final_results",
                columns: new[] { "game_id", "placement" });

            migrationBuilder.CreateIndex(
                name: "ix_game_team_invitations_game_id_status",
                table: "game_team_invitations",
                columns: new[] { "game_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_game_team_invitations_game_slot",
                table: "game_team_invitations",
                columns: new[] { "game_id", "slot_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_team_invitations_game_team",
                table: "game_team_invitations",
                columns: new[] { "game_id", "team_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_team_invitations_invited_by_user_id",
                table: "game_team_invitations",
                column: "invited_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_team_invitations_invited_user_id_status",
                table: "game_team_invitations",
                columns: new[] { "invited_user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ux_game_team_invitations_one_pending_per_user",
                table: "game_team_invitations",
                columns: new[] { "game_id", "invited_user_id" },
                unique: true,
                filter: "status = 'pending'");

            migrationBuilder.CreateIndex(
                name: "ix_game_team_members_game_id_team_id",
                table: "game_team_members",
                columns: new[] { "game_id", "team_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_team_members_team_id_user_id",
                table: "game_team_members",
                columns: new[] { "team_id", "user_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_team_members_user_id",
                table: "game_team_members",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ux_game_team_members_active_game_user",
                table: "game_team_members",
                columns: new[] { "game_id", "user_id" },
                unique: true,
                filter: "left_at_utc IS NULL");

            migrationBuilder.CreateIndex(
                name: "ux_game_team_members_active_team_user",
                table: "game_team_members",
                columns: new[] { "team_id", "user_id" },
                unique: true,
                filter: "left_at_utc IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_game_team_slots_game_id_slot_index",
                table: "game_team_slots",
                columns: new[] { "game_id", "slot_index" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_team_slots_game_id_slot_type",
                table: "game_team_slots",
                columns: new[] { "game_id", "slot_type" });

            migrationBuilder.CreateIndex(
                name: "ix_game_teams_confirmed_by_user_id",
                table: "game_teams",
                column: "confirmed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_teams_created_by_user_id",
                table: "game_teams",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_teams_disband_requested_by_user_id",
                table: "game_teams",
                column: "disband_requested_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_teams_disbanded_by_user_id",
                table: "game_teams",
                column: "disbanded_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_teams_game_id_status",
                table: "game_teams",
                columns: new[] { "game_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_game_teams_game_slot",
                table: "game_teams",
                columns: new[] { "game_id", "slot_id" });

            migrationBuilder.CreateIndex(
                name: "ix_game_teams_rejected_by_user_id",
                table: "game_teams",
                column: "rejected_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ux_game_teams_active_slot",
                table: "game_teams",
                column: "slot_id",
                unique: true,
                filter: "status IN ('forming','confirmed')");

            migrationBuilder.CreateIndex(
                name: "ix_game_user_notifications_game_id",
                table: "game_user_notifications",
                column: "game_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_user_notifications_user_id_read_at_utc_created_at_utc",
                table: "game_user_notifications",
                columns: new[] { "user_id", "read_at_utc", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_game_user_notifications_user_id_type_created_at_utc",
                table: "game_user_notifications",
                columns: new[] { "user_id", "type", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ux_game_user_notifications_deduplication",
                table: "game_user_notifications",
                columns: new[] { "user_id", "deduplication_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_games_active_team_same_game",
                table: "games",
                columns: new[] { "id", "active_team_id" });

            migrationBuilder.CreateIndex(
                name: "ix_games_created_at_utc",
                table: "games",
                column: "created_at_utc");

            migrationBuilder.CreateIndex(
                name: "ix_games_is_deleted_status_created_at_utc",
                table: "games",
                columns: new[] { "is_deleted", "status", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ux_games_single_current",
                table: "games",
                column: "is_deleted",
                unique: true,
                filter: "is_deleted = FALSE AND status IN ('ready','active')");

            migrationBuilder.CreateIndex(
                name: "ux_games_single_draft",
                table: "games",
                column: "is_deleted",
                unique: true,
                filter: "is_deleted = FALSE AND status = 'draft'");

            migrationBuilder.CreateIndex(
                name: "ix_media_assets_bucket_object_key",
                table: "media_assets",
                columns: new[] { "bucket", "object_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_modifier_conflicts_definition",
                table: "modifier_definition_version_conflicts",
                column: "conflicting_modifier_id");

            migrationBuilder.CreateIndex(
                name: "ix_modifier_definition_versions_cascade_source_modifier_id",
                table: "modifier_definition_versions",
                column: "cascade_source_modifier_id");

            migrationBuilder.CreateIndex(
                name: "ix_modifier_definition_versions_created_by_user_id",
                table: "modifier_definition_versions",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_modifier_definition_versions_modifier_id_created_at_utc_id",
                table: "modifier_definition_versions",
                columns: new[] { "modifier_id", "created_at_utc", "id" });

            migrationBuilder.CreateIndex(
                name: "ix_modifier_definition_versions_modifier_id_revision",
                table: "modifier_definition_versions",
                columns: new[] { "modifier_id", "revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_modifier_versions_category_trgm",
                table: "modifier_definition_versions",
                column: "category")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "ix_modifier_versions_name_trgm",
                table: "modifier_definition_versions",
                column: "name")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "ix_modifier_definitions_archived_by_user_id",
                table: "modifier_definitions",
                column: "archived_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_modifier_definitions_created_at_utc_id",
                table: "modifier_definitions",
                columns: new[] { "created_at_utc", "id" },
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "ix_modifier_definitions_created_by_user_id",
                table: "modifier_definitions",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_modifier_definitions_current_version_id",
                table: "modifier_definitions",
                column: "current_version_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_modifier_definitions_id_current_version_id",
                table: "modifier_definitions",
                columns: new[] { "id", "current_version_id" });

            migrationBuilder.CreateIndex(
                name: "ix_modifier_definitions_is_archived_created_at_utc_id",
                table: "modifier_definitions",
                columns: new[] { "is_archived", "created_at_utc", "id" },
                descending: new[] { false, true, true });

            migrationBuilder.CreateIndex(
                name: "ix_question_accepted_answers_question_id_normalized_answer",
                table: "question_accepted_answers",
                columns: new[] { "question_id", "normalized_answer" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_question_accepted_answers_question_id_sort_order",
                table: "question_accepted_answers",
                columns: new[] { "question_id", "sort_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_question_accepted_answers_text_trgm",
                table: "question_accepted_answers",
                column: "answer_text")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "ux_question_accepted_answers_one_primary",
                table: "question_accepted_answers",
                column: "question_id",
                unique: true,
                filter: "is_primary = TRUE");

            migrationBuilder.CreateIndex(
                name: "ix_question_categories_name",
                table: "question_categories",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_questions_active_pick_queue",
                table: "question_definitions",
                columns: new[] { "is_deleted", "is_enabled", "priority" });

            migrationBuilder.CreateIndex(
                name: "ix_questions_category_enabled",
                table: "question_definitions",
                columns: new[] { "category_id", "is_enabled" });

            migrationBuilder.CreateIndex(
                name: "ix_questions_priority",
                table: "question_definitions",
                column: "priority");

            migrationBuilder.CreateIndex(
                name: "ix_questions_text_trgm",
                table: "question_definitions",
                column: "text")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "ux_questions_external_code",
                table: "question_definitions",
                column: "external_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_roles_code",
                table: "roles",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_user_role_audit_events_changed_by_user_id_occurred_at_utc",
                table: "user_role_audit_events",
                columns: new[] { "changed_by_user_id", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_user_role_audit_events_role_id",
                table: "user_role_audit_events",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_role_audit_events_user_id_occurred_at_utc",
                table: "user_role_audit_events",
                columns: new[] { "user_id", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_user_roles_assigned_by_user_id",
                table: "user_roles",
                column: "assigned_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_roles_expires_at_utc",
                table: "user_roles",
                column: "expires_at_utc",
                filter: "expires_at_utc IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_user_roles_role_id",
                table: "user_roles",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_login",
                table: "users",
                column: "login");

            migrationBuilder.CreateIndex(
                name: "ix_users_twitch_user_id",
                table: "users",
                column: "twitch_user_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_game_board_cell_media_game_board_cells_cell_id",
                table: "game_board_cell_media",
                column: "cell_id",
                principalTable: "game_board_cells",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_board_cells_game_boards_board_id",
                table: "game_board_cells",
                column: "board_id",
                principalTable: "game_boards",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_boards_games_game_id",
                table: "game_boards",
                column: "game_id",
                principalTable: "games",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_enabled_modifiers_games_game_id",
                table: "game_enabled_modifiers",
                column: "game_id",
                principalTable: "games",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_enabled_modifiers_modifier_definitions_modifier_id",
                table: "game_enabled_modifiers",
                column: "modifier_id",
                principalTable: "modifier_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_game_enabled_modifiers_modifier_version",
                table: "game_enabled_modifiers",
                columns: new[] { "modifier_id", "modifier_version_id" },
                principalTable: "modifier_definition_versions",
                principalColumns: new[] { "modifier_id", "id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_game_enabled_questions_games_game_id",
                table: "game_enabled_questions",
                column: "game_id",
                principalTable: "games",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_finalizations_games_game_id",
                table: "game_finalizations",
                column: "game_id",
                principalTable: "games",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_modifier_activations_games_game_id",
                table: "game_modifier_activations",
                column: "game_id",
                principalTable: "games",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_modifier_activations_modifier_definitions_modifier_id",
                table: "game_modifier_activations",
                column: "modifier_id",
                principalTable: "modifier_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_game_modifier_activations_modifier_version",
                table: "game_modifier_activations",
                columns: new[] { "modifier_id", "modifier_version_id" },
                principalTable: "modifier_definition_versions",
                principalColumns: new[] { "modifier_id", "id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_modifier_activations_game_rounds_same_game",
                table: "game_modifier_activations",
                columns: new[] { "game_id", "round_id" },
                principalTable: "game_rounds",
                principalColumns: new[] { "game_id", "id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_quiz_correct_answers_round_same_game",
                table: "game_quiz_correct_answers",
                columns: new[] { "game_id", "quiz_round_id" },
                principalTable: "game_quiz_rounds",
                principalColumns: new[] { "game_id", "id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_game_quiz_point_ledger_entries_games_game_id",
                table: "game_quiz_point_ledger_entries",
                column: "game_id",
                principalTable: "games",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_game_quiz_rounds_games_game_id",
                table: "game_quiz_rounds",
                column: "game_id",
                principalTable: "games",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_round_cell_media_game_rounds_round_id",
                table: "game_round_cell_media",
                column: "round_id",
                principalTable: "game_rounds",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_round_modifier_results_game_rounds_round_id",
                table: "game_round_modifier_results",
                column: "round_id",
                principalTable: "game_rounds",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_modifier_results_definition",
                table: "game_round_modifier_results",
                column: "modifier_id",
                principalTable: "modifier_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_game_round_participants_game_rounds_round_id",
                table: "game_round_participants",
                column: "round_id",
                principalTable: "game_rounds",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_round_transition_audits_game_rounds_round_id",
                table: "game_round_transition_audits",
                column: "round_id",
                principalTable: "game_rounds",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_rounds_game_teams_same_game",
                table: "game_rounds",
                columns: new[] { "game_id", "team_id" },
                principalTable: "game_teams",
                principalColumns: new[] { "game_id", "id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_game_rounds_games_game_id",
                table: "game_rounds",
                column: "game_id",
                principalTable: "games",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_game_team_final_results_team_same_game",
                table: "game_team_final_results",
                columns: new[] { "game_id", "team_id" },
                principalTable: "game_teams",
                principalColumns: new[] { "game_id", "id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_game_team_invitations_game_team_slots_game_id_slot_id",
                table: "game_team_invitations",
                columns: new[] { "game_id", "slot_id" },
                principalTable: "game_team_slots",
                principalColumns: new[] { "game_id", "id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_game_team_invitations_games_game_id",
                table: "game_team_invitations",
                column: "game_id",
                principalTable: "games",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_team_invitations_team_same_game",
                table: "game_team_invitations",
                columns: new[] { "game_id", "team_id" },
                principalTable: "game_teams",
                principalColumns: new[] { "game_id", "id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_game_team_members_game_teams_game_id_team_id",
                table: "game_team_members",
                columns: new[] { "game_id", "team_id" },
                principalTable: "game_teams",
                principalColumns: new[] { "game_id", "id" },
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_team_members_games_game_id",
                table: "game_team_members",
                column: "game_id",
                principalTable: "games",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_team_slots_games_game_id",
                table: "game_team_slots",
                column: "game_id",
                principalTable: "games",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_game_teams_games_game_id",
                table: "game_teams",
                column: "game_id",
                principalTable: "games",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_modifier_conflicts_definition",
                table: "modifier_definition_version_conflicts",
                column: "conflicting_modifier_id",
                principalTable: "modifier_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_modifier_conflicts_version",
                table: "modifier_definition_version_conflicts",
                column: "modifier_version_id",
                principalTable: "modifier_definition_versions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_modifier_versions_cascade_source",
                table: "modifier_definition_versions",
                column: "cascade_source_modifier_id",
                principalTable: "modifier_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_modifier_versions_definition",
                table: "modifier_definition_versions",
                column: "modifier_id",
                principalTable: "modifier_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            AddDatabaseInvariants(migrationBuilder);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            DropDatabaseInvariants(migrationBuilder);

            migrationBuilder.DropForeignKey(
                name: "fk_game_team_slots_games_game_id",
                table: "game_team_slots");

            migrationBuilder.DropForeignKey(
                name: "fk_game_teams_games_game_id",
                table: "game_teams");

            migrationBuilder.DropForeignKey(
                name: "fk_modifier_versions_cascade_source",
                table: "modifier_definition_versions");

            migrationBuilder.DropForeignKey(
                name: "fk_modifier_versions_definition",
                table: "modifier_definition_versions");

            migrationBuilder.DropTable(
                name: "game_board_cell_media");

            migrationBuilder.DropTable(
                name: "game_quiz_point_ledger_entries");

            migrationBuilder.DropTable(
                name: "game_round_cell_media");

            migrationBuilder.DropTable(
                name: "game_round_modifier_results");

            migrationBuilder.DropTable(
                name: "game_round_participants");

            migrationBuilder.DropTable(
                name: "game_round_transition_audits");

            migrationBuilder.DropTable(
                name: "game_team_final_results");

            migrationBuilder.DropTable(
                name: "game_team_invitations");

            migrationBuilder.DropTable(
                name: "game_team_members");

            migrationBuilder.DropTable(
                name: "game_user_notifications");

            migrationBuilder.DropTable(
                name: "modifier_definition_version_conflicts");

            migrationBuilder.DropTable(
                name: "question_accepted_answers");

            migrationBuilder.DropTable(
                name: "user_role_audit_events");

            migrationBuilder.DropTable(
                name: "user_roles");

            migrationBuilder.DropTable(
                name: "media_assets");

            migrationBuilder.DropTable(
                name: "game_quiz_correct_answers");

            migrationBuilder.DropTable(
                name: "game_modifier_activations");

            migrationBuilder.DropTable(
                name: "game_finalizations");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "game_quiz_rounds");

            migrationBuilder.DropTable(
                name: "game_enabled_modifiers");

            migrationBuilder.DropTable(
                name: "game_rounds");

            migrationBuilder.DropTable(
                name: "game_enabled_questions");

            migrationBuilder.DropTable(
                name: "game_board_cells");

            migrationBuilder.DropTable(
                name: "question_definitions");

            migrationBuilder.DropTable(
                name: "game_boards");

            migrationBuilder.DropTable(
                name: "question_categories");

            migrationBuilder.DropTable(
                name: "games");

            migrationBuilder.DropTable(
                name: "game_teams");

            migrationBuilder.DropTable(
                name: "game_team_slots");

            migrationBuilder.DropTable(
                name: "modifier_definitions");

            migrationBuilder.DropTable(
                name: "modifier_definition_versions");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
