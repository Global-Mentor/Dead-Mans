using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public class QuestionCategoryConfiguration : IEntityTypeConfiguration<QuestionCategory>
{
    public void Configure(EntityTypeBuilder<QuestionCategory> builder)
    {
        builder.ToTable(
            "question_categories",
            tableBuilder =>
            {
                tableBuilder.HasCheckConstraint("ck_question_categories_format", "format IN ('text', 'screenshot')");
                tableBuilder.HasCheckConstraint(
                    "ck_question_categories_name_not_blank",
                    "length(trim(name)) > 0"
                );
                tableBuilder.HasCheckConstraint(
                    "ck_question_categories_timestamps",
                    "updated_at_utc >= created_at_utc"
                );
            }
        );

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Format).HasMaxLength(16).HasDefaultValue("text").IsRequired();
        builder.Property(x => x.Name).HasColumnType("citext").HasMaxLength(64).IsRequired();
        builder.Property(x => x.CreatedAtUtc).IsRequired();
        builder.Property(x => x.UpdatedAtUtc).IsRequired();

        builder.HasIndex(x => new { x.Format, x.Name }).IsUnique();
    }
}
