using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class QuestionScreenshotConfiguration : IEntityTypeConfiguration<QuestionScreenshot>
{
    public void Configure(EntityTypeBuilder<QuestionScreenshot> builder)
    {
        builder.ToTable("question_screenshots");
        builder.HasKey(x => x.QuestionId);
        builder.HasIndex(x => x.UploadRequestId).IsUnique();
        builder.HasIndex(x => x.MediaAssetId).IsUnique();
        builder.Property(x => x.UploadFingerprint).HasMaxLength(64).IsRequired();
        builder.HasOne(x => x.Question).WithOne().HasForeignKey<QuestionScreenshot>(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Location).WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.MediaAsset).WithMany().HasForeignKey(x => x.MediaAssetId).OnDelete(DeleteBehavior.Restrict);
    }
}
