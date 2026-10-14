using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class GameRoundBroadcastDraftConfiguration : IEntityTypeConfiguration<GameRoundBroadcastDraft>
{
    public void Configure(EntityTypeBuilder<GameRoundBroadcastDraft> builder)
    {
        builder.ToTable("game_round_broadcast_drafts", table =>
        {
            table.HasCheckConstraint("ck_round_broadcast_draft_counts", "kills_count >= 0 AND bounty_count >= 0 AND round_version > 0");
        });
        builder.HasKey(draft => draft.RoundId);
        builder.Property(draft => draft.ScoreDetailsJson).HasColumnType("jsonb");
        builder.HasOne(draft => draft.Round).WithMany().HasForeignKey(draft => draft.RoundId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
