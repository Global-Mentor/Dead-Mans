using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public sealed class GameQuizSubmissionConfiguration
    : IEntityTypeConfiguration<GameQuizSubmission>
{
    public void Configure(EntityTypeBuilder<GameQuizSubmission> builder)
    {
        builder.ToTable(
            "game_quiz_submissions",
            table =>
            {
                table.HasCheckConstraint(
                    "ck_game_quiz_submissions_identity_snapshots_not_blank",
                    "length(trim(twitch_user_id_snapshot)) > 0 "
                    + "AND length(trim(login_snapshot)) > 0 "
                    + "AND length(trim(display_name_snapshot)) > 0"
                );
                table.HasCheckConstraint(
                    "ck_game_quiz_submissions_option_text_not_blank",
                    "length(trim(selected_option_text_snapshot)) > 0"
                );
                table.HasCheckConstraint(
                    "ck_game_quiz_submissions_award_semantics",
                    "awarded_points >= 0 AND (is_correct = TRUE OR awarded_points = 0)"
                );
                table.HasCheckConstraint(
                    "ck_game_quiz_submissions_source_allowed",
                    GameQuizAnswerSourceValue.CheckSqlAllowed
                );
                table.HasCheckConstraint(
                    "ck_game_quiz_submissions_source_semantics",
                    "(source_provider IN ('manual','web') AND source_channel_id IS NULL "
                    + "AND source_message_id IS NULL) OR "
                    + "(source_provider = 'twitch' AND source_channel_id IS NOT NULL "
                    + "AND source_message_id IS NOT NULL "
                    + "AND length(trim(source_channel_id)) > 0 "
                    + "AND length(trim(source_message_id)) > 0)"
                );
            }
        );

        builder.HasKey(x => x.Id);
        builder.HasAlternateKey(x => new { x.GameId, x.Id });
        builder.Property(x => x.TwitchUserIdSnapshot).HasMaxLength(64).IsRequired();
        builder.Property(x => x.LoginSnapshot).HasMaxLength(64).IsRequired();
        builder.Property(x => x.DisplayNameSnapshot).HasMaxLength(128).IsRequired();
        builder.Property(x => x.SelectedOptionTextSnapshot).HasMaxLength(500).IsRequired();
        builder.Property(x => x.SourceProvider).HasMaxLength(32).IsRequired();
        builder.Property(x => x.SourceChannelId).HasMaxLength(128);
        builder.Property(x => x.SourceMessageId).HasMaxLength(128);
        builder.Property(x => x.SubmittedAtUtc).IsRequired();

        builder.HasIndex(x => new { x.QuestionSessionId, x.UserId }).IsUnique();
        builder.HasIndex(x => new { x.GameId, x.UserId, x.SubmittedAtUtc });
        builder
            .HasIndex(
                x => new { x.SourceProvider, x.SourceChannelId, x.SourceMessageId },
                "ux_game_quiz_submissions_source_message"
            )
            .IsUnique()
            .HasFilter("source_channel_id IS NOT NULL AND source_message_id IS NOT NULL");

        builder
            .HasOne(x => x.QuestionSession)
            .WithMany(x => x.Submissions)
            .HasForeignKey(x => new { x.GameId, x.QuestionSessionId })
            .HasPrincipalKey(x => new { x.GameId, x.Id })
            .HasConstraintName("fk_quiz_submissions_question_session_same_game")
            .OnDelete(DeleteBehavior.Restrict);
        builder
            .HasOne(x => x.User)
            .WithMany(x => x.QuizSubmissions)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);
        builder
            .HasOne(x => x.CapturedByUser)
            .WithMany()
            .HasForeignKey(x => x.CapturedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
