using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public class GameModifierSelectionConfiguration : IEntityTypeConfiguration<GameModifierSelection>
{
    public void Configure(EntityTypeBuilder<GameModifierSelection> builder)
    {
        builder.ToTable(
            "game_modifier_selections",
            tableBuilder =>
            {
                tableBuilder.HasCheckConstraint(
                    "CK_game_modifier_selections_code_not_blank",
                    "length(trim(\"ModifierCode\")) > 0"
                );
            }
        );

        builder.HasKey(x => new { x.GameId, x.ModifierCode });
        builder.Property(x => x.ModifierCode).HasMaxLength(64).IsRequired();
        builder.Property(x => x.EnabledAtUtc).IsRequired();

        builder.HasIndex(x => x.GameId);

        builder.HasOne(x => x.Game)
            .WithMany(x => x.EnabledModifiers)
            .HasForeignKey(x => x.GameId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.ModifierDefinition)
            .WithMany(x => x.GameSelections)
            .HasForeignKey(x => x.ModifierCode)
            .HasPrincipalKey(x => x.Code)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
