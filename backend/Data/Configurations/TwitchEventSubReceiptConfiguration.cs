using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class TwitchEventSubReceiptConfiguration : IEntityTypeConfiguration<TwitchEventSubReceipt>
{
    public void Configure(EntityTypeBuilder<TwitchEventSubReceipt> builder)
    {
        builder.ToTable("twitch_eventsub_receipts");
        builder.HasKey(x => x.NotificationId);
        builder.Property(x => x.NotificationId).HasMaxLength(128);
        builder.Property(x => x.ChatMessageId).HasMaxLength(128);
        builder.Property(x => x.Outcome).HasMaxLength(64).IsRequired();
        builder.HasIndex(x => x.ChatMessageId).IsUnique().HasFilter("chat_message_id IS NOT NULL");
        builder.HasIndex(x => x.ProcessedAtUtc);
    }
}
