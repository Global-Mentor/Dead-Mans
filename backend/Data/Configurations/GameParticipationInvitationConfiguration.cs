using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public class GameParticipationInvitationConfiguration
    : IEntityTypeConfiguration<GameParticipationInvitation>
{
    public void Configure(EntityTypeBuilder<GameParticipationInvitation> builder)
    {
        builder.ToTable(
            "game_participation_invitations",
            tableBuilder =>
            {
                tableBuilder.HasCheckConstraint(
                    "CK_game_participation_invitations_status",
                    ParticipationInvitationStatusValue.CheckSqlAllowedStatuses
                );
                tableBuilder.HasCheckConstraint(
                    "CK_game_participation_invitations_invited_by_kind",
                    InvitedByKindValue.CheckSqlAllowed
                );
            }
        );

        builder.HasKey(x => x.Id);
        builder.Property(x => x.InvitedByKind).HasMaxLength(16).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(16).IsRequired();
        builder.Property(x => x.CreatedAtUtc).IsRequired();

        builder.HasIndex(x => new { x.GameId, x.Status });
        builder.HasIndex(x => new { x.InvitedUserId, x.Status });
        builder
            .HasIndex(x => new { x.GameId, x.InvitedUserId })
            .IsUnique()
            .HasFilter($"\"Status\" = '{ParticipationInvitationStatusValue.Pending}'")
            .HasDatabaseName("UX_game_participation_invitations_one_pending_per_user");

        builder
            .HasOne(x => x.Game)
            .WithMany()
            .HasForeignKey(x => x.GameId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(x => x.Slot)
            .WithMany()
            .HasForeignKey(x => new { x.GameId, x.SlotId })
            .HasPrincipalKey(x => new { x.GameId, x.Id })
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(x => x.Team)
            .WithMany()
            .HasForeignKey(x => new { x.GameId, x.TeamId })
            .HasPrincipalKey(x => new { x.GameId, x.Id })
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.InvitedUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.InvitedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
