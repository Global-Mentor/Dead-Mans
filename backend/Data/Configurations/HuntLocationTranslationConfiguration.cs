using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class HuntLocationTranslationConfiguration : IEntityTypeConfiguration<HuntLocationTranslation>
{
    public void Configure(EntityTypeBuilder<HuntLocationTranslation> builder)
    {
        builder.ToTable("hunt_location_translations", table =>
        {
            table.HasCheckConstraint("ck_hunt_location_translations_locale", "locale IN ('en', 'ru', 'uk', 'pl')");
            table.HasCheckConstraint("ck_hunt_location_translations_name", "name ~ '[^[:space:]]'");
        });
        builder.HasKey(translation => new { translation.LocationId, translation.Locale });
        builder.Property(translation => translation.Locale).HasMaxLength(2).IsRequired();
        builder.Property(translation => translation.Name).HasMaxLength(200).IsRequired();
        builder.HasOne(translation => translation.Location).WithMany(location => location.Translations)
            .HasForeignKey(translation => translation.LocationId).OnDelete(DeleteBehavior.Restrict);
    }
}
