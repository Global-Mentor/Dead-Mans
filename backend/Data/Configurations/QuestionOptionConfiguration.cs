using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class QuestionOptionConfiguration : IEntityTypeConfiguration<QuestionOption>
{
    public void Configure(EntityTypeBuilder<QuestionOption> builder)
    {
        builder.ToTable(
            "question_options",
            table =>
            {
                table.HasCheckConstraint(
                    "ck_question_options_text_not_blank",
                    "length(trim(text)) > 0 AND length(trim(normalized_text)) > 0"
                );
                table.HasCheckConstraint("ck_question_options_sort_order_non_negative", "sort_order >= 0");
            }
        );

        builder.HasKey(x => x.Id);
        builder.HasAlternateKey(x => new { x.QuestionId, x.Id });
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Text).HasMaxLength(500).IsRequired();
        builder.Property(x => x.NormalizedText).HasMaxLength(500).IsRequired();
        builder.Property(x => x.IsCorrect).IsRequired();
        builder.Property(x => x.SortOrder).IsRequired();
        builder.Property(x => x.CreatedAtUtc).IsRequired();

        builder.HasIndex(x => new { x.QuestionId, x.NormalizedText }).IsUnique();
        builder.HasIndex(x => new { x.QuestionId, x.SortOrder }).IsUnique();
        builder
            .HasIndex(x => x.QuestionId, "ux_question_options_one_correct")
            .IsUnique()
            .HasFilter("is_correct = TRUE");
        builder
            .HasIndex(x => x.Text, "ix_question_options_text_trgm")
            .HasMethod("gin")
            .HasOperators("gin_trgm_ops");

        builder
            .HasOne(x => x.Question)
            .WithMany(x => x.Options)
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
