using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class UserRoleAuditEventConfiguration : IEntityTypeConfiguration<UserRoleAuditEvent>
{
    public void Configure(EntityTypeBuilder<UserRoleAuditEvent> builder)
    {
        builder.ToTable(
            "user_role_audit_events",
            table => table.HasCheckConstraint(
                "ck_user_role_audit_events_action",
                "action IN ('granted', 'revoked')"
            )
        );

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Action).HasMaxLength(16).IsRequired();
        builder.Property(x => x.OccurredAtUtc).IsRequired();

        builder.HasOne(x => x.User)
            .WithMany(x => x.RoleAuditEvents)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Role)
            .WithMany(x => x.AuditEvents)
            .HasForeignKey(x => x.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ChangedByUser)
            .WithMany(x => x.PerformedRoleAuditEvents)
            .HasForeignKey(x => x.ChangedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.UserId, x.OccurredAtUtc });
        builder.HasIndex(x => new { x.ChangedByUserId, x.OccurredAtUtc });
        builder.HasIndex(x => x.RoleId);
    }
}
