using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGameRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_games_finishedat_semantics",
                table: "games");

            migrationBuilder.DropCheckConstraint(
                name: "CK_games_status_allowed",
                table: "games");

            migrationBuilder.AddColumn<short>(
                name: "MaxPlayersPerTeam",
                table: "games",
                type: "smallint",
                nullable: false,
                defaultValue: (short)3);

            migrationBuilder.AddColumn<short>(
                name: "MinPlayersPerTeam",
                table: "games",
                type: "smallint",
                nullable: false,
                defaultValue: (short)1);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReadyAtUtc",
                table: "games",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "games"
                SET
                  "Status" = 'ready',
                  "ReadyAtUtc" = "CreatedAtUtc",
                  "StartedAtUtc" = NULL
                WHERE "Id" = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid;
                """
            );

            migrationBuilder.CreateTable(
                name: "game_participation_slots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    SlotIndex = table.Column<int>(type: "integer", nullable: false),
                    Availability = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ReservedLabel = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_game_participation_slots", x => x.Id);
                    table.UniqueConstraint("AK_game_participation_slots_GameId_Id", x => new { x.GameId, x.Id });
                    table.CheckConstraint("CK_game_participation_slots_availability", "\"Availability\" IN ('public','reserved')");
                    table.ForeignKey(
                        name: "FK_game_participation_slots_games_GameId",
                        column: x => x.GameId,
                        principalTable: "games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(
                """
                INSERT INTO "game_participation_slots" ("Id", "GameId", "SlotIndex", "Availability", "ReservedLabel", "CreatedAtUtc")
                SELECT slot."Id", game_row."Id", slot."SlotIndex", 'public', NULL, game_row."ReadyAtUtc"
                FROM "games" AS game_row
                CROSS JOIN (VALUES
                  ('a615abf5-c309-48cb-b787-45d9e8c4a2db'::uuid, 1),
                  ('e62d7e69-1c9e-435d-8d7c-fb39627c642f'::uuid, 2),
                  ('529e1684-c3bb-45f0-a76c-3675e8a29a21'::uuid, 3),
                  ('08e18272-37b4-4985-a629-262cb8372995'::uuid, 4),
                  ('72c9326b-1634-4283-a739-5498936fdff7'::uuid, 5),
                  ('f197148f-e3b1-4059-9449-0b5eef88095a'::uuid, 6)
                ) AS slot("Id", "SlotIndex")
                WHERE game_row."Id" = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid;
                """
            );

            migrationBuilder.CreateTable(
                name: "game_teams",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    SlotId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecruitmentOpen = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConfirmedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConfirmedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RejectedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DisbandedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_game_teams", x => x.Id);
                    table.UniqueConstraint("AK_game_teams_GameId_Id", x => new { x.GameId, x.Id });
                    table.CheckConstraint("CK_game_teams_status_allowed", "\"Status\" IN ('forming','confirmed','rejected','disbanded')");
                    table.ForeignKey(
                        name: "FK_game_teams_game_participation_slots_GameId_SlotId",
                        columns: x => new { x.GameId, x.SlotId },
                        principalTable: "game_participation_slots",
                        principalColumns: new[] { "GameId", "Id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_game_teams_games_GameId",
                        column: x => x.GameId,
                        principalTable: "games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_game_teams_users_ConfirmedByUserId",
                        column: x => x.ConfirmedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_game_teams_users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_game_teams_users_RejectedByUserId",
                        column: x => x.RejectedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "game_participation_invitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    SlotId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamId = table.Column<Guid>(type: "uuid", nullable: true),
                    InvitedUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvitedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvitedByKind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RespondedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_game_participation_invitations", x => x.Id);
                    table.CheckConstraint("CK_game_participation_invitations_invited_by_kind", "\"InvitedByKind\" IN ('admin','member')");
                    table.CheckConstraint("CK_game_participation_invitations_status", "\"Status\" IN ('pending','accepted','declined','cancelled','expired')");
                    table.ForeignKey(
                        name: "FK_game_participation_invitations_game_participation_slots_Gam~",
                        columns: x => new { x.GameId, x.SlotId },
                        principalTable: "game_participation_slots",
                        principalColumns: new[] { "GameId", "Id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_game_participation_invitations_game_teams_GameId_TeamId",
                        columns: x => new { x.GameId, x.TeamId },
                        principalTable: "game_teams",
                        principalColumns: new[] { "GameId", "Id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_game_participation_invitations_games_GameId",
                        column: x => x.GameId,
                        principalTable: "games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_game_participation_invitations_users_InvitedByUserId",
                        column: x => x.InvitedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_game_participation_invitations_users_InvitedUserId",
                        column: x => x.InvitedUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "game_team_members",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    JoinedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LeftAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_game_team_members", x => x.Id);
                    table.ForeignKey(
                        name: "FK_game_team_members_game_teams_GameId_TeamId",
                        columns: x => new { x.GameId, x.TeamId },
                        principalTable: "game_teams",
                        principalColumns: new[] { "GameId", "Id" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_game_team_members_games_GameId",
                        column: x => x.GameId,
                        principalTable: "games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_game_team_members_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "UX_games_single_active",
                table: "games",
                column: "Status",
                unique: true,
                filter: "\"Status\" = 'active'");

            migrationBuilder.CreateIndex(
                name: "UX_games_single_ready",
                table: "games",
                column: "Status",
                unique: true,
                filter: "\"Status\" = 'ready'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_games_finishedat_semantics",
                table: "games",
                sql: "((\"Status\" IN ('draft','ready','active')) AND \"FinishedAtUtc\" IS NULL) OR ((\"Status\" = 'finished') AND \"FinishedAtUtc\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_games_lifecycle_timestamps",
                table: "games",
                sql: "((\"Status\" = 'draft') AND \"ReadyAtUtc\" IS NULL AND \"StartedAtUtc\" IS NULL AND \"FinishedAtUtc\" IS NULL) OR ((\"Status\" = 'ready') AND \"ReadyAtUtc\" IS NOT NULL AND \"StartedAtUtc\" IS NULL AND \"FinishedAtUtc\" IS NULL) OR ((\"Status\" = 'active') AND \"ReadyAtUtc\" IS NOT NULL AND \"StartedAtUtc\" IS NOT NULL AND \"FinishedAtUtc\" IS NULL) OR ((\"Status\" = 'finished') AND \"ReadyAtUtc\" IS NOT NULL AND \"StartedAtUtc\" IS NOT NULL AND \"FinishedAtUtc\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_games_status_allowed",
                table: "games",
                sql: "\"Status\" IN ('draft','ready','active','finished')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_games_team_size_limits",
                table: "games",
                sql: "\"MinPlayersPerTeam\" > 0 AND \"MaxPlayersPerTeam\" >= \"MinPlayersPerTeam\"");

            migrationBuilder.CreateIndex(
                name: "IX_game_participation_invitations_GameId_SlotId",
                table: "game_participation_invitations",
                columns: new[] { "GameId", "SlotId" });

            migrationBuilder.CreateIndex(
                name: "IX_game_participation_invitations_GameId_Status",
                table: "game_participation_invitations",
                columns: new[] { "GameId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_game_participation_invitations_GameId_TeamId",
                table: "game_participation_invitations",
                columns: new[] { "GameId", "TeamId" });

            migrationBuilder.CreateIndex(
                name: "IX_game_participation_invitations_InvitedByUserId",
                table: "game_participation_invitations",
                column: "InvitedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_game_participation_invitations_InvitedUserId_Status",
                table: "game_participation_invitations",
                columns: new[] { "InvitedUserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "UX_game_participation_invitations_one_pending_per_user",
                table: "game_participation_invitations",
                columns: new[] { "GameId", "InvitedUserId" },
                unique: true,
                filter: "\"Status\" = 'pending'");

            migrationBuilder.CreateIndex(
                name: "IX_game_participation_slots_GameId_Availability",
                table: "game_participation_slots",
                columns: new[] { "GameId", "Availability" });

            migrationBuilder.CreateIndex(
                name: "IX_game_participation_slots_GameId_SlotIndex",
                table: "game_participation_slots",
                columns: new[] { "GameId", "SlotIndex" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_game_team_members_GameId_TeamId",
                table: "game_team_members",
                columns: new[] { "GameId", "TeamId" });

            migrationBuilder.CreateIndex(
                name: "IX_game_team_members_TeamId_UserId",
                table: "game_team_members",
                columns: new[] { "TeamId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_game_team_members_UserId",
                table: "game_team_members",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "UX_game_team_members_active_game_user",
                table: "game_team_members",
                columns: new[] { "GameId", "UserId" },
                unique: true,
                filter: "\"LeftAtUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "UX_game_team_members_active_team_user",
                table: "game_team_members",
                columns: new[] { "TeamId", "UserId" },
                unique: true,
                filter: "\"LeftAtUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_game_teams_ConfirmedByUserId",
                table: "game_teams",
                column: "ConfirmedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_game_teams_CreatedByUserId",
                table: "game_teams",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_game_teams_GameId_SlotId",
                table: "game_teams",
                columns: new[] { "GameId", "SlotId" });

            migrationBuilder.CreateIndex(
                name: "IX_game_teams_GameId_Status",
                table: "game_teams",
                columns: new[] { "GameId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_game_teams_RejectedByUserId",
                table: "game_teams",
                column: "RejectedByUserId");

            migrationBuilder.CreateIndex(
                name: "UX_game_teams_active_slot",
                table: "game_teams",
                column: "SlotId",
                unique: true,
                filter: "\"Status\" IN ('forming','confirmed')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "game_participation_invitations");

            migrationBuilder.DropTable(
                name: "game_team_members");

            migrationBuilder.DropTable(
                name: "game_teams");

            migrationBuilder.DropTable(
                name: "game_participation_slots");

            migrationBuilder.DropIndex(
                name: "UX_games_single_active",
                table: "games");

            migrationBuilder.DropIndex(
                name: "UX_games_single_ready",
                table: "games");

            migrationBuilder.DropCheckConstraint(
                name: "CK_games_finishedat_semantics",
                table: "games");

            migrationBuilder.DropCheckConstraint(
                name: "CK_games_lifecycle_timestamps",
                table: "games");

            migrationBuilder.DropCheckConstraint(
                name: "CK_games_status_allowed",
                table: "games");

            migrationBuilder.DropCheckConstraint(
                name: "CK_games_team_size_limits",
                table: "games");

            migrationBuilder.DropColumn(
                name: "MaxPlayersPerTeam",
                table: "games");

            migrationBuilder.DropColumn(
                name: "MinPlayersPerTeam",
                table: "games");

            migrationBuilder.DropColumn(
                name: "ReadyAtUtc",
                table: "games");

            migrationBuilder.Sql(
                """
                UPDATE "games"
                SET
                  "Status" = 'active',
                  "StartedAtUtc" = "CreatedAtUtc",
                  "FinishedAtUtc" = NULL
                WHERE "Id" = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid;
                """
            );

            migrationBuilder.AddCheckConstraint(
                name: "CK_games_finishedat_semantics",
                table: "games",
                sql: "((\"Status\" IN ('draft','active')) AND \"FinishedAtUtc\" IS NULL) OR ((\"Status\" = 'finished') AND \"FinishedAtUtc\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_games_status_allowed",
                table: "games",
                sql: "\"Status\" IN ('draft','active','finished')");
        }
    }
}
