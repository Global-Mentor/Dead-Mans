using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public class QuestionVectorConfiguration : IEntityTypeConfiguration<QuestionVector>
{
    public void Configure(EntityTypeBuilder<QuestionVector> builder)
    {
        builder.ToTable(
            "question_vectors",
            tableBuilder =>
            {
                tableBuilder.HasCheckConstraint(
                    "CK_question_vectors_code_not_blank",
                    "length(trim(\"Code\")) > 0"
                );
            }
        );

        builder.HasKey(x => x.Code);

        builder.Property(x => x.Code).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.IsEnabled).HasDefaultValue(true);
        builder.Property(x => x.CreatedAtUtc).IsRequired();
        builder.Property(x => x.UpdatedAtUtc).IsRequired();
    }
}
