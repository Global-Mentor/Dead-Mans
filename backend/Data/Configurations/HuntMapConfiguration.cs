using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class HuntMapConfiguration : IEntityTypeConfiguration<HuntMap>
{
    public void Configure(EntityTypeBuilder<HuntMap> builder)
    {
        builder.ToTable("hunt_maps", table =>
            table.HasCheckConstraint("ck_hunt_maps_code", "code ~ '^[a-z][a-z0-9_]*$'"));
        builder.HasKey(map => map.Id);
        builder.Property(map => map.Id).ValueGeneratedNever();
        builder.Property(map => map.Code).HasMaxLength(64).IsRequired();
        builder.Property(map => map.IsEnabled).IsRequired();
        builder.HasIndex(map => map.Code).IsUnique();
    }
}
