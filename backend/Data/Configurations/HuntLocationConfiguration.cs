using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class HuntLocationConfiguration : IEntityTypeConfiguration<HuntLocation>
{
    public void Configure(EntityTypeBuilder<HuntLocation> builder)
    {
        builder.ToTable("hunt_locations", table =>
            table.HasCheckConstraint("ck_hunt_locations_code", "code ~ '^[a-z][a-z0-9_]*$'"));
        builder.HasKey(location => location.Id);
        builder.Property(location => location.Id).ValueGeneratedNever();
        builder.Property(location => location.Code).HasMaxLength(64).IsRequired();
        builder.Property(location => location.IsEnabled).IsRequired();
        builder.HasIndex(location => new { location.MapId, location.Code }).IsUnique();
        builder.HasOne(location => location.Map).WithMany(map => map.Locations)
            .HasForeignKey(location => location.MapId).OnDelete(DeleteBehavior.Restrict);
    }
}
