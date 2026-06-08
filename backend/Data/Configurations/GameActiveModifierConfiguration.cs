using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public class GameActiveModifierConfiguration : IEntityTypeConfiguration<GameActiveModifier>
{
    public void Configure(EntityTypeBuilder<GameActiveModifier> builder)
    {
        builder.ToTable(
            "game_active_modifiers",
            tableBuilder =>
            {
                tableBuilder.HasCheckConstraint(
                    "CK_game_active_modifiers_code_not_blank",
                    "length(trim(\"ModifierCode\")) > 0"
                );
            }
        );

        builder.HasKey(x => x.Id);
        builder.Property(x => x.ModifierCode).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ActivatedAtUtc).IsRequired();
        builder.Property(x => x.ActivatedByUserId).IsRequired();

        builder.HasIndex(x => new { x.GameId, x.ModifierCode });
        builder.HasIndex(x => new { x.GameId, x.ActivatedAtUtc });
        builder.HasIndex(x => new { x.ActivatedByUserId, x.ActivatedAtUtc });

        builder.HasOne(x => x.Game)
            .WithMany(x => x.ActiveModifiers)
            .HasForeignKey(x => x.GameId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.ModifierDefinition)
            .WithMany(x => x.GameActivations)
            .HasForeignKey(x => x.ModifierCode)
            .HasPrincipalKey(x => x.Code)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ActivatedByUser)
            .WithMany(x => x.ActivatedGameModifiers)
            .HasForeignKey(x => x.ActivatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
