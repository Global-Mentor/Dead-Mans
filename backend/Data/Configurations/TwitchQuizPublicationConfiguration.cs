using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class TwitchQuizPublicationConfiguration : IEntityTypeConfiguration<TwitchQuizPublication>
{
    public void Configure(EntityTypeBuilder<TwitchQuizPublication> builder)
    {
        builder.ToTable("twitch_quiz_publications");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.QuestionCodeSnapshot).HasMaxLength(64).IsRequired();
        builder.Property(x => x.CategoryNameSnapshot).HasMaxLength(64).IsRequired();
        builder.Property(x => x.QuestionTextSnapshot).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.OptionIdsSnapshot).HasColumnType("uuid[]").IsRequired();
        builder.Property(x => x.OptionTextsSnapshot).HasColumnType("text[]").IsRequired();
        builder.Property(x => x.QuestionMessage).HasMaxLength(500).IsRequired();
        builder.Property(x => x.OptionsMessage).HasMaxLength(500).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(32).IsRequired();
        builder.Property(x => x.QuestionDeliveryStatus).HasMaxLength(32).IsRequired();
        builder.Property(x => x.OptionsDeliveryStatus).HasMaxLength(32).IsRequired();
        builder.Property(x => x.OutcomeDeliveryStatus).HasMaxLength(32).IsRequired();
        builder.Property(x => x.QuestionMessageId).HasMaxLength(128);
        builder.Property(x => x.OptionsMessageId).HasMaxLength(128);
        builder.Property(x => x.OutcomeMessageId).HasMaxLength(128);
        builder.Property(x => x.LastError).HasMaxLength(1000);
        builder.HasIndex(x => new { x.GameId, x.AskOrder }).IsUnique();
        builder.HasIndex(x => new { x.GameId, x.QuestionId }).IsUnique().HasFilter("status <> 'cancelled'");
        builder.HasIndex(x => x.QuestionSessionId).IsUnique();
        builder.HasIndex(x => x.GameId, "ux_twitch_quiz_publications_active")
            .IsUnique()
            .HasFilter("status IN ('publishing','failed','uncertain','cancel_pending','open')");
        builder.HasOne(x => x.Game).WithMany().HasForeignKey(x => x.GameId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Question).WithMany().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.QuestionSession).WithMany().HasForeignKey(x => x.QuestionSessionId)
            .HasConstraintName("fk_twitch_quiz_publications_question_session")
            .OnDelete(DeleteBehavior.Restrict);
    }
}
