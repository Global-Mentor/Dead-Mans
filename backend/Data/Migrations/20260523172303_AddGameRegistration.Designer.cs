using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using backend.Data;

#nullable disable

namespace backend.Data.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260523172303_AddGameRegistration")]
    partial class AddGameRegistration
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "8.0.4")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);

            modelBuilder.Entity("backend.Data.Entities.BoardCell", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<Guid>("BoardId")
                        .HasColumnType("uuid");

                    b.Property<string>("CellType")
                        .IsRequired()
                        .HasMaxLength(32)
                        .HasColumnType("character varying(32)");

                    b.Property<int>("ColIndex")
                        .HasColumnType("integer");

                    b.Property<int>("Cost")
                        .HasColumnType("integer");

                    b.Property<string>("Description")
                        .HasMaxLength(2000)
                        .HasColumnType("character varying(2000)");

                    b.Property<int>("RowIndex")
                        .HasColumnType("integer");

                    b.Property<string>("State")
                        .IsRequired()
                        .HasMaxLength(32)
                        .HasColumnType("character varying(32)");

                    b.Property<string>("Title")
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)");

                    b.HasKey("Id");

                    b.HasIndex("BoardId");

                    b.HasIndex("State");

                    b.HasIndex("BoardId", "RowIndex", "ColIndex")
                        .IsUnique();

                    b.ToTable("board_cells", null, t =>
                        {
                            t.HasCheckConstraint("CK_board_cells_state_allowed", "\"State\" IN ('open','closed')");
                        });
                });

            modelBuilder.Entity("backend.Data.Entities.BoardCellMedia", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<Guid>("CellId")
                        .HasColumnType("uuid");

                    b.Property<Guid>("MediaAssetId")
                        .HasColumnType("uuid");

                    b.Property<string>("Role")
                        .IsRequired()
                        .HasMaxLength(32)
                        .HasColumnType("character varying(32)");

                    b.Property<int>("SortOrder")
                        .HasColumnType("integer");

                    b.HasKey("Id");

                    b.HasIndex("CellId");

                    b.HasIndex("MediaAssetId");

                    b.HasIndex("CellId", "SortOrder")
                        .IsUnique();

                    b.ToTable("board_cell_media", (string)null);
                });

            modelBuilder.Entity("backend.Data.Entities.Game", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<DateTime>("CreatedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Description")
                        .HasMaxLength(2000)
                        .HasColumnType("character varying(2000)");

                    b.Property<DateTime?>("FinishedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<short>("MaxPlayersPerTeam")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("smallint")
                        .HasDefaultValue((short)3);

                    b.Property<short>("MinPlayersPerTeam")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("smallint")
                        .HasDefaultValue((short)1);

                    b.Property<DateTime?>("ReadyAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<DateTime?>("StartedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Status")
                        .IsRequired()
                        .HasMaxLength(32)
                        .HasColumnType("character varying(32)");

                    b.Property<string>("Title")
                        .IsRequired()
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)");

                    b.HasKey("Id");

                    b.HasIndex("CreatedAtUtc");

                    b.HasIndex("Status", "CreatedAtUtc");

                    b.HasIndex(new[] { "Status" }, "UX_games_single_active")
                        .IsUnique()
                        .HasFilter("\"Status\" = 'active'");

                    b.HasIndex(new[] { "Status" }, "UX_games_single_draft")
                        .IsUnique()
                        .HasFilter("\"Status\" = 'draft'");

                    b.HasIndex(new[] { "Status" }, "UX_games_single_ready")
                        .IsUnique()
                        .HasFilter("\"Status\" = 'ready'");

                    b.ToTable("games", null, t =>
                        {
                            t.HasCheckConstraint("CK_games_finishedat_semantics", "((\"Status\" IN ('draft','ready','active')) AND \"FinishedAtUtc\" IS NULL) OR ((\"Status\" = 'finished') AND \"FinishedAtUtc\" IS NOT NULL)");

                            t.HasCheckConstraint("CK_games_lifecycle_timestamps", "((\"Status\" = 'draft') AND \"ReadyAtUtc\" IS NULL AND \"StartedAtUtc\" IS NULL AND \"FinishedAtUtc\" IS NULL) OR ((\"Status\" = 'ready') AND \"ReadyAtUtc\" IS NOT NULL AND \"StartedAtUtc\" IS NULL AND \"FinishedAtUtc\" IS NULL) OR ((\"Status\" = 'active') AND \"ReadyAtUtc\" IS NOT NULL AND \"StartedAtUtc\" IS NOT NULL AND \"FinishedAtUtc\" IS NULL) OR ((\"Status\" = 'finished') AND \"ReadyAtUtc\" IS NOT NULL AND \"StartedAtUtc\" IS NOT NULL AND \"FinishedAtUtc\" IS NOT NULL)");

                            t.HasCheckConstraint("CK_games_status_allowed", "\"Status\" IN ('draft','ready','active','finished')");

                            t.HasCheckConstraint("CK_games_team_size_limits", "\"MinPlayersPerTeam\" > 0 AND \"MaxPlayersPerTeam\" >= \"MinPlayersPerTeam\"");
                        });
                });

            modelBuilder.Entity("backend.Data.Entities.GameBoard", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string[]>("ColLabels")
                        .IsRequired()
                        .HasColumnType("jsonb");

                    b.Property<int>("Cols")
                        .HasColumnType("integer");

                    b.Property<DateTime>("CreatedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid>("GameId")
                        .HasColumnType("uuid");

                    b.Property<string[]>("RowLabels")
                        .IsRequired()
                        .HasColumnType("jsonb");

                    b.Property<int>("Rows")
                        .HasColumnType("integer");

                    b.Property<int>("Version")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer")
                        .HasDefaultValue(1);

                    b.HasKey("Id");

                    b.HasIndex("GameId")
                        .IsUnique();

                    b.ToTable("game_boards", null, t =>
                        {
                            t.HasCheckConstraint("CK_game_boards_dimensions_positive", "\"Rows\" > 0 AND \"Cols\" > 0");

                            t.HasCheckConstraint("CK_game_boards_labels_match_dimensions", "jsonb_array_length(\"RowLabels\") = \"Rows\" AND jsonb_array_length(\"ColLabels\") = \"Cols\"");
                        });
                });

            modelBuilder.Entity("backend.Data.Entities.GameParticipationInvitation", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<DateTime>("CreatedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid>("GameId")
                        .HasColumnType("uuid");

                    b.Property<string>("InvitedByKind")
                        .IsRequired()
                        .HasMaxLength(16)
                        .HasColumnType("character varying(16)");

                    b.Property<Guid>("InvitedByUserId")
                        .HasColumnType("uuid");

                    b.Property<Guid>("InvitedUserId")
                        .HasColumnType("uuid");

                    b.Property<DateTime?>("RespondedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid>("SlotId")
                        .HasColumnType("uuid");

                    b.Property<string>("Status")
                        .IsRequired()
                        .HasMaxLength(16)
                        .HasColumnType("character varying(16)");

                    b.Property<Guid?>("TeamId")
                        .HasColumnType("uuid");

                    b.HasKey("Id");

                    b.HasIndex("InvitedByUserId");

                    b.HasIndex("GameId", "InvitedUserId")
                        .IsUnique()
                        .HasDatabaseName("UX_game_participation_invitations_one_pending_per_user")
                        .HasFilter("\"Status\" = 'pending'");

                    b.HasIndex("GameId", "SlotId");

                    b.HasIndex("GameId", "Status");

                    b.HasIndex("GameId", "TeamId");

                    b.HasIndex("InvitedUserId", "Status");

                    b.ToTable("game_participation_invitations", null, t =>
                        {
                            t.HasCheckConstraint("CK_game_participation_invitations_invited_by_kind", "\"InvitedByKind\" IN ('admin','member')");

                            t.HasCheckConstraint("CK_game_participation_invitations_status", "\"Status\" IN ('pending','accepted','declined','cancelled','expired')");
                        });
                });

            modelBuilder.Entity("backend.Data.Entities.GameParticipationSlot", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string>("Availability")
                        .IsRequired()
                        .HasMaxLength(16)
                        .HasColumnType("character varying(16)");

                    b.Property<DateTime>("CreatedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid>("GameId")
                        .HasColumnType("uuid");

                    b.Property<string>("ReservedLabel")
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)");

                    b.Property<int>("SlotIndex")
                        .HasColumnType("integer");

                    b.HasKey("Id");

                    b.HasIndex("GameId", "Availability");

                    b.HasIndex("GameId", "SlotIndex")
                        .IsUnique();

                    b.ToTable("game_participation_slots", null, t =>
                        {
                            t.HasCheckConstraint("CK_game_participation_slots_availability", "\"Availability\" IN ('public','reserved')");
                        });
                });

            modelBuilder.Entity("backend.Data.Entities.GameTeam", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<DateTime?>("ConfirmedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid?>("ConfirmedByUserId")
                        .HasColumnType("uuid");

                    b.Property<DateTime>("CreatedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid?>("CreatedByUserId")
                        .HasColumnType("uuid");

                    b.Property<DateTime?>("DisbandedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid>("GameId")
                        .HasColumnType("uuid");

                    b.Property<bool>("RecruitmentOpen")
                        .HasColumnType("boolean");

                    b.Property<DateTime?>("RejectedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid?>("RejectedByUserId")
                        .HasColumnType("uuid");

                    b.Property<Guid>("SlotId")
                        .HasColumnType("uuid");

                    b.Property<string>("Status")
                        .IsRequired()
                        .HasMaxLength(32)
                        .HasColumnType("character varying(32)");

                    b.Property<DateTime>("UpdatedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.HasKey("Id");

                    b.HasIndex("ConfirmedByUserId");

                    b.HasIndex("CreatedByUserId");

                    b.HasIndex("RejectedByUserId");

                    b.HasIndex("GameId", "SlotId");

                    b.HasIndex("GameId", "Status");

                    b.HasIndex(new[] { "SlotId" }, "UX_game_teams_active_slot")
                        .IsUnique()
                        .HasFilter("\"Status\" IN ('forming','confirmed')");

                    b.ToTable("game_teams", null, t =>
                        {
                            t.HasCheckConstraint("CK_game_teams_status_allowed", "\"Status\" IN ('forming','confirmed','rejected','disbanded')");
                        });
                });

            modelBuilder.Entity("backend.Data.Entities.GameTeamMember", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<Guid>("GameId")
                        .HasColumnType("uuid");

                    b.Property<DateTime>("JoinedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<DateTime?>("LeftAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid>("TeamId")
                        .HasColumnType("uuid");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uuid");

                    b.HasKey("Id");

                    b.HasIndex("UserId");

                    b.HasIndex("GameId", "TeamId");

                    b.HasIndex("TeamId", "UserId");

                    b.HasIndex(new[] { "GameId", "UserId" }, "UX_game_team_members_active_game_user")
                        .IsUnique()
                        .HasFilter("\"LeftAtUtc\" IS NULL");

                    b.HasIndex(new[] { "TeamId", "UserId" }, "UX_game_team_members_active_team_user")
                        .IsUnique()
                        .HasFilter("\"LeftAtUtc\" IS NULL");

                    b.ToTable("game_team_members", (string)null);
                });

            modelBuilder.Entity("backend.Data.Entities.MediaAsset", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string>("Bucket")
                        .IsRequired()
                        .HasMaxLength(128)
                        .HasColumnType("character varying(128)");

                    b.Property<DateTime>("CreatedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("MimeType")
                        .IsRequired()
                        .HasMaxLength(256)
                        .HasColumnType("character varying(256)");

                    b.Property<string>("ObjectKey")
                        .IsRequired()
                        .HasMaxLength(1024)
                        .HasColumnType("character varying(1024)");

                    b.Property<string>("Scope")
                        .IsRequired()
                        .HasMaxLength(32)
                        .HasColumnType("character varying(32)");

                    b.Property<long>("SizeBytes")
                        .HasColumnType("bigint");

                    b.Property<string>("Status")
                        .IsRequired()
                        .HasMaxLength(32)
                        .HasColumnType("character varying(32)");

                    b.HasKey("Id");

                    b.HasIndex("Status");

                    b.HasIndex("Bucket", "ObjectKey")
                        .IsUnique();

                    b.ToTable("media_assets", null, t =>
                        {
                            t.HasCheckConstraint("CK_media_assets_scope_allowed", "\"Scope\" IN ('private')");

                            t.HasCheckConstraint("CK_media_assets_status_allowed", "\"Status\" IN ('pending','active')");
                        });
                });

            modelBuilder.Entity("backend.Data.Entities.Role", b =>
                {
                    b.Property<short>("Id")
                        .HasColumnType("smallint");

                    b.Property<string>("Code")
                        .IsRequired()
                        .HasMaxLength(32)
                        .HasColumnType("character varying(32)");

                    b.Property<DateTime>("CreatedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Description")
                        .HasMaxLength(256)
                        .HasColumnType("character varying(256)");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasMaxLength(64)
                        .HasColumnType("character varying(64)");

                    b.Property<DateTime>("UpdatedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.HasKey("Id");

                    b.HasIndex("Code")
                        .IsUnique();

                    b.ToTable("roles", (string)null);

                    b.HasData(
                        new
                        {
                            Id = (short)1,
                            Code = "viewer",
                            CreatedAtUtc = new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc),
                            Description = "Viewer role with basic registration capabilities.",
                            Name = "Viewer",
                            UpdatedAtUtc = new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc)
                        },
                        new
                        {
                            Id = (short)2,
                            Code = "moderator",
                            CreatedAtUtc = new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc),
                            Description = "Moderator role that helps manage game operations.",
                            Name = "Moderator",
                            UpdatedAtUtc = new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc)
                        },
                        new
                        {
                            Id = (short)3,
                            Code = "admin",
                            CreatedAtUtc = new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc),
                            Description = "Administrator role with full management access.",
                            Name = "Administrator",
                            UpdatedAtUtc = new DateTime(2026, 3, 23, 0, 0, 0, 0, DateTimeKind.Utc)
                        });
                });

            modelBuilder.Entity("backend.Data.Entities.User", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string>("BroadcasterType")
                        .HasMaxLength(32)
                        .HasColumnType("character varying(32)");

                    b.Property<DateTime>("CreatedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("DisplayName")
                        .IsRequired()
                        .HasMaxLength(64)
                        .HasColumnType("character varying(64)");

                    b.Property<string>("Email")
                        .HasMaxLength(320)
                        .HasColumnType("character varying(320)");

                    b.Property<bool?>("EmailVerified")
                        .HasColumnType("boolean");

                    b.Property<bool>("IsActive")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("boolean")
                        .HasDefaultValue(true);

                    b.Property<DateTime?>("LastLoginAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Login")
                        .IsRequired()
                        .HasMaxLength(64)
                        .HasColumnType("character varying(64)");

                    b.Property<string>("ProfileImageUrl")
                        .HasMaxLength(1024)
                        .HasColumnType("character varying(1024)");

                    b.Property<string>("TwitchUserId")
                        .IsRequired()
                        .HasMaxLength(64)
                        .HasColumnType("character varying(64)");

                    b.Property<string>("TwitchUserType")
                        .HasMaxLength(32)
                        .HasColumnType("character varying(32)");

                    b.Property<DateTime>("UpdatedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.HasKey("Id");

                    b.HasIndex("Login");

                    b.HasIndex("TwitchUserId")
                        .IsUnique();

                    b.ToTable("users", (string)null);
                });

            modelBuilder.Entity("backend.Data.Entities.UserRole", b =>
                {
                    b.Property<Guid>("UserId")
                        .HasColumnType("uuid");

                    b.Property<short>("RoleId")
                        .HasColumnType("smallint");

                    b.Property<DateTime>("AssignedAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid?>("AssignedByUserId")
                        .HasColumnType("uuid");

                    b.Property<DateTime?>("ExpiresAtUtc")
                        .HasColumnType("timestamp with time zone");

                    b.HasKey("UserId", "RoleId");

                    b.HasIndex("AssignedByUserId");

                    b.HasIndex("ExpiresAtUtc");

                    b.HasIndex("RoleId");

                    b.ToTable("user_roles", (string)null);
                });

            modelBuilder.Entity("backend.Data.Entities.BoardCell", b =>
                {
                    b.HasOne("backend.Data.Entities.GameBoard", "Board")
                        .WithMany("Cells")
                        .HasForeignKey("BoardId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Board");
                });

            modelBuilder.Entity("backend.Data.Entities.BoardCellMedia", b =>
                {
                    b.HasOne("backend.Data.Entities.BoardCell", "Cell")
                        .WithMany("MediaLinks")
                        .HasForeignKey("CellId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("backend.Data.Entities.MediaAsset", "MediaAsset")
                        .WithMany("CellLinks")
                        .HasForeignKey("MediaAssetId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Cell");

                    b.Navigation("MediaAsset");
                });

            modelBuilder.Entity("backend.Data.Entities.GameBoard", b =>
                {
                    b.HasOne("backend.Data.Entities.Game", "Game")
                        .WithOne("Board")
                        .HasForeignKey("backend.Data.Entities.GameBoard", "GameId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Game");
                });

            modelBuilder.Entity("backend.Data.Entities.GameParticipationInvitation", b =>
                {
                    b.HasOne("backend.Data.Entities.Game", "Game")
                        .WithMany()
                        .HasForeignKey("GameId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("backend.Data.Entities.User", null)
                        .WithMany()
                        .HasForeignKey("InvitedByUserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("backend.Data.Entities.User", null)
                        .WithMany()
                        .HasForeignKey("InvitedUserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("backend.Data.Entities.GameParticipationSlot", "Slot")
                        .WithMany()
                        .HasForeignKey("GameId", "SlotId")
                        .HasPrincipalKey("GameId", "Id")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("backend.Data.Entities.GameTeam", "Team")
                        .WithMany()
                        .HasForeignKey("GameId", "TeamId")
                        .HasPrincipalKey("GameId", "Id")
                        .OnDelete(DeleteBehavior.Restrict);

                    b.Navigation("Game");

                    b.Navigation("Slot");

                    b.Navigation("Team");
                });

            modelBuilder.Entity("backend.Data.Entities.GameParticipationSlot", b =>
                {
                    b.HasOne("backend.Data.Entities.Game", "Game")
                        .WithMany("ParticipationSlots")
                        .HasForeignKey("GameId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Game");
                });

            modelBuilder.Entity("backend.Data.Entities.GameTeam", b =>
                {
                    b.HasOne("backend.Data.Entities.User", null)
                        .WithMany()
                        .HasForeignKey("ConfirmedByUserId")
                        .OnDelete(DeleteBehavior.SetNull);

                    b.HasOne("backend.Data.Entities.User", null)
                        .WithMany()
                        .HasForeignKey("CreatedByUserId")
                        .OnDelete(DeleteBehavior.SetNull);

                    b.HasOne("backend.Data.Entities.Game", "Game")
                        .WithMany()
                        .HasForeignKey("GameId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("backend.Data.Entities.User", null)
                        .WithMany()
                        .HasForeignKey("RejectedByUserId")
                        .OnDelete(DeleteBehavior.SetNull);

                    b.HasOne("backend.Data.Entities.GameParticipationSlot", "Slot")
                        .WithMany()
                        .HasForeignKey("GameId", "SlotId")
                        .HasPrincipalKey("GameId", "Id")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("Game");

                    b.Navigation("Slot");
                });

            modelBuilder.Entity("backend.Data.Entities.GameTeamMember", b =>
                {
                    b.HasOne("backend.Data.Entities.Game", null)
                        .WithMany()
                        .HasForeignKey("GameId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("backend.Data.Entities.User", "User")
                        .WithMany()
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("backend.Data.Entities.GameTeam", "Team")
                        .WithMany("Members")
                        .HasForeignKey("GameId", "TeamId")
                        .HasPrincipalKey("GameId", "Id")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Team");

                    b.Navigation("User");
                });

            modelBuilder.Entity("backend.Data.Entities.UserRole", b =>
                {
                    b.HasOne("backend.Data.Entities.User", "AssignedByUser")
                        .WithMany("AssignedRoles")
                        .HasForeignKey("AssignedByUserId")
                        .OnDelete(DeleteBehavior.Restrict);

                    b.HasOne("backend.Data.Entities.Role", "Role")
                        .WithMany("UserRoles")
                        .HasForeignKey("RoleId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("backend.Data.Entities.User", "User")
                        .WithMany("UserRoles")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("AssignedByUser");

                    b.Navigation("Role");

                    b.Navigation("User");
                });

            modelBuilder.Entity("backend.Data.Entities.BoardCell", b =>
                {
                    b.Navigation("MediaLinks");
                });

            modelBuilder.Entity("backend.Data.Entities.Game", b =>
                {
                    b.Navigation("Board");

                    b.Navigation("ParticipationSlots");
                });

            modelBuilder.Entity("backend.Data.Entities.GameBoard", b =>
                {
                    b.Navigation("Cells");
                });

            modelBuilder.Entity("backend.Data.Entities.GameTeam", b =>
                {
                    b.Navigation("Members");
                });

            modelBuilder.Entity("backend.Data.Entities.MediaAsset", b =>
                {
                    b.Navigation("CellLinks");
                });

            modelBuilder.Entity("backend.Data.Entities.Role", b =>
                {
                    b.Navigation("UserRoles");
                });

            modelBuilder.Entity("backend.Data.Entities.User", b =>
                {
                    b.Navigation("AssignedRoles");

                    b.Navigation("UserRoles");
                });
#pragma warning restore 612, 618
        }
    }
}
