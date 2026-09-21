using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class TwitchQuizConnectionConfiguration : IEntityTypeConfiguration<TwitchQuizConnection>
{
    public void Configure(EntityTypeBuilder<TwitchQuizConnection> builder)
    {
        builder.ToTable("twitch_quiz_connections");
        builder.HasKey(x => x.Role);
        builder.Property(x => x.Role).HasMaxLength(32);
        builder.Property(x => x.TwitchUserId).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Login).HasMaxLength(64).IsRequired();
        builder.Property(x => x.DisplayName).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ProtectedAccessToken).HasMaxLength(8192).IsRequired();
        builder.Property(x => x.ProtectedRefreshToken).HasMaxLength(8192).IsRequired();
        builder.Property(x => x.Scopes).HasColumnType("text[]").IsRequired();
        builder.Property(x => x.LastError).HasMaxLength(1000);
        builder.HasIndex(x => x.TwitchUserId);
    }
}
