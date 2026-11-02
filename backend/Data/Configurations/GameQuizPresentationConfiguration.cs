using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class GameQuizPresentationConfiguration : IEntityTypeConfiguration<GameQuizPresentation>
{
    public void Configure(EntityTypeBuilder<GameQuizPresentation> builder)
    {
        builder.ToTable("game_quiz_presentations");
        builder.HasKey(x => x.GameId);
        builder.HasOne(x => x.QuestionSession).WithMany()
            .HasForeignKey(x => new { x.GameId, x.QuestionSessionId })
            .HasPrincipalKey(x => new { x.GameId, x.Id }).OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_presentations_session");
    }
}
