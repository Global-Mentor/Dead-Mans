using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class GameOverlayKeyConfiguration : IEntityTypeConfiguration<GameOverlayKey>
{
    public void Configure(EntityTypeBuilder<GameOverlayKey> builder)
    {
        builder.ToTable("game_overlay_keys");
        builder.HasKey(key => key.OwnerId);
        builder.Property(key => key.KeyHash).HasMaxLength(64).IsRequired();
        builder.Property(key => key.TestEnabled).HasDefaultValue(false);
        builder.HasIndex(key => key.KeyHash).IsUnique();
        builder.HasOne(key => key.Owner).WithMany().HasForeignKey(key => key.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
