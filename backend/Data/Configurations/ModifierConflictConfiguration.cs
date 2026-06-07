using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public class ModifierConflictConfiguration : IEntityTypeConfiguration<ModifierConflict>
{
    public void Configure(EntityTypeBuilder<ModifierConflict> builder)
    {
        builder.ToTable(
            "modifier_conflicts",
            tableBuilder =>
            {
                tableBuilder.HasCheckConstraint(
                    "CK_modifier_conflicts_distinct_codes",
                    "\"ModifierCode\" <> \"ConflictsWithModifierCode\""
                );
            }
        );

        builder.HasKey(x => new { x.ModifierCode, x.ConflictsWithModifierCode });
        builder.Property(x => x.ModifierCode).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ConflictsWithModifierCode).HasMaxLength(64).IsRequired();

        builder.HasOne(x => x.Modifier)
            .WithMany()
            .HasForeignKey(x => x.ModifierCode)
            .HasPrincipalKey(x => x.Code)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.ConflictsWithModifier)
            .WithMany()
            .HasForeignKey(x => x.ConflictsWithModifierCode)
            .HasPrincipalKey(x => x.Code)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasData(
            Pair("prokaznik", "mentorbait"),
            Pair("mentorbait", "prokaznik"),
            Pair("prokaznik", "krysa"),
            Pair("krysa", "prokaznik"),
            Pair("prokaznik", "shot"),
            Pair("shot", "prokaznik"),
            Pair("mentorbait", "krysa"),
            Pair("krysa", "mentorbait")
        );
    }

    private static ModifierConflict Pair(string left, string right) =>
        new() { ModifierCode = left, ConflictsWithModifierCode = right };
}
