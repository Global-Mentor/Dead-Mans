using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public class GameQuestionRoundConfiguration : IEntityTypeConfiguration<GameQuestionRound>
{
    public void Configure(EntityTypeBuilder<GameQuestionRound> builder)
    {
        builder.ToTable(
            "game_question_rounds",
            tableBuilder =>
            {
                tableBuilder.HasCheckConstraint(
                    "CK_game_question_rounds_status_allowed",
                    GameQuestionRoundStatusValue.CheckSqlAllowedStatuses
                );
                tableBuilder.HasCheckConstraint(
                    "CK_game_question_rounds_ask_order_positive",
                    "\"AskOrder\" > 0"
                );
                tableBuilder.HasCheckConstraint(
                    "CK_game_question_rounds_awarded_points_non_negative_or_null",
                    "\"AwardedPoints\" IS NULL OR \"AwardedPoints\" >= 0"
                );
            }
        );

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Status).HasMaxLength(32).IsRequired();
        builder.Property(x => x.AnsweredByDisplayName).HasMaxLength(128);
        builder.Property(x => x.SubmittedAnswer).HasMaxLength(500);
        builder.Property(x => x.AskedAtUtc).IsRequired();
        builder.Property(x => x.AskOrder).IsRequired();

        builder.HasIndex(x => new { x.GameId, x.QuestionId }).IsUnique();
        builder.HasIndex(x => new { x.GameId, x.AskOrder }).IsUnique();
        builder.HasIndex(x => new { x.GameId, x.AskedAtUtc });
        builder.HasIndex(x => new { x.GameId, x.Status });
        builder.HasIndex(x => new { x.AnsweredForUserId, x.AnsweredAtUtc });
        builder.HasIndex(x => new { x.AnsweredByUserId, x.AnsweredAtUtc });
        builder.HasIndex(x => new { x.AskedByUserId, x.AskedAtUtc });

        builder
            .HasOne(x => x.Game)
            .WithMany()
            .HasForeignKey(x => x.GameId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(x => x.Question)
            .WithMany(x => x.AskedInGames)
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(x => x.AskedByUser)
            .WithMany(x => x.AskedGameQuestionRounds)
            .HasForeignKey(x => x.AskedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(x => x.AnsweredByUser)
            .WithMany(x => x.AnsweredGameQuestionRounds)
            .HasForeignKey(x => x.AnsweredByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(x => x.AnsweredForUser)
            .WithMany(x => x.CreditedGameQuestionRounds)
            .HasForeignKey(x => x.AnsweredForUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
