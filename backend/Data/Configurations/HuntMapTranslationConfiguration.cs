using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class HuntMapTranslationConfiguration : IEntityTypeConfiguration<HuntMapTranslation>
{
    public void Configure(EntityTypeBuilder<HuntMapTranslation> builder)
    {
        builder.ToTable("hunt_map_translations", table =>
        {
            table.HasCheckConstraint("ck_hunt_map_translations_locale", "locale IN ('en', 'ru', 'uk', 'pl')");
            table.HasCheckConstraint("ck_hunt_map_translations_name", "name ~ '[^[:space:]]'");
        });
        builder.HasKey(translation => new { translation.MapId, translation.Locale });
        builder.Property(translation => translation.Locale).HasMaxLength(2).IsRequired();
        builder.Property(translation => translation.Name).HasMaxLength(200).IsRequired();
        builder.HasOne(translation => translation.Map).WithMany(map => map.Translations)
            .HasForeignKey(translation => translation.MapId).OnDelete(DeleteBehavior.Restrict);
    }
}
