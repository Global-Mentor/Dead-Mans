using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Configurations;

public class GameQuizQuestionSessionConfiguration : IEntityTypeConfiguration<GameQuizQuestionSession>
{
    public void Configure(EntityTypeBuilder<GameQuizQuestionSession> builder)
    {
        builder.ToTable(
            "game_quiz_question_sessions",
            tableBuilder =>
            {
                tableBuilder.HasCheckConstraint(
                    "ck_game_quiz_question_sessions_status_allowed",
                    GameQuizQuestionSessionStatusValue.CheckSqlAllowedStatuses
                );
                tableBuilder.HasCheckConstraint(
                    "ck_game_quiz_question_sessions_ask_order_positive",
                    "ask_order > 0"
                );
                tableBuilder.HasCheckConstraint(
                    "ck_game_quiz_question_sessions_window",
                    "closes_at_utc > asked_at_utc AND "
                    + "(closed_at_utc IS NULL OR (closed_at_utc >= asked_at_utc AND closed_at_utc <= closes_at_utc))"
                );
                tableBuilder.HasCheckConstraint(
                    "ck_game_quiz_question_sessions_snapshot",
                    "question_revision_snapshot > 0 AND reward_snapshot >= 0 "
                    + "AND length(trim(question_code_snapshot)) > 0 "
                    + "AND length(trim(category_name_snapshot)) > 0 "
                    + "AND length(trim(question_text_snapshot)) > 0 "
                    + "AND cardinality(option_ids_snapshot) BETWEEN 2 AND 10 "
                    + "AND cardinality(option_ids_snapshot) = cardinality(option_texts_snapshot) "
                    + "AND correct_option_id_snapshot = ANY(option_ids_snapshot)"
                );
                tableBuilder.HasCheckConstraint(
                    "ck_game_quiz_question_sessions_delivery_kind_allowed",
                    GameQuizDeliveryKindValue.CheckSqlAllowed
                );
                tableBuilder.HasCheckConstraint(
                    "ck_game_quiz_question_sessions_delivery_source_semantics",
                    "(delivery_kind = 'manual' AND source_channel_id IS NULL "
                    + "AND source_message_id IS NULL) OR "
                    + "(delivery_kind = 'twitch' AND source_channel_id IS NOT NULL "
                    + "AND length(trim(source_channel_id)) > 0 "
                    + "AND (source_message_id IS NULL OR length(trim(source_message_id)) > 0))"
                );
                tableBuilder.HasCheckConstraint(
                    "ck_game_quiz_question_sessions_close_semantics",
                    "((status = 'open') AND closed_at_utc IS NULL) OR "
                    + "((status IN ('closed','skipped')) AND closed_at_utc IS NOT NULL)"
                );
            }
        );

        builder.HasKey(x => x.Id);
        builder.HasAlternateKey(x => new { x.GameId, x.Id });

        builder.Property(x => x.Status).HasMaxLength(32).IsRequired();
        builder.Property(x => x.QuestionCodeSnapshot).HasMaxLength(64).IsRequired();
        builder.Property(x => x.CategoryNameSnapshot).HasMaxLength(64).IsRequired();
        builder.Property(x => x.QuestionTextSnapshot).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.OptionIdsSnapshot).HasColumnType("uuid[]").IsRequired();
        builder.Property(x => x.OptionTextsSnapshot).HasColumnType("text[]").IsRequired();
        builder.Property(x => x.CorrectOptionIdSnapshot).IsRequired();
        builder.Property(x => x.DeliveryKind).HasMaxLength(32).IsRequired();
        builder.Property(x => x.SourceChannelId).HasMaxLength(128);
        builder.Property(x => x.SourceMessageId).HasMaxLength(128);
        builder.Property(x => x.AskedAtUtc).IsRequired();
        builder.Property(x => x.AskOrder).IsRequired();

        builder.HasIndex(x => new { x.GameId, x.QuestionId }).IsUnique();
        builder.HasIndex(x => new { x.GameId, x.AskOrder }).IsUnique();
        builder
            .HasIndex(x => x.GameId, "ux_game_quiz_question_sessions_one_open")
            .IsUnique()
            .HasFilter("status = 'open'");
        builder.HasIndex(x => new { x.GameId, x.AskedAtUtc });
        builder.HasIndex(x => new { x.GameId, x.Status });
        builder.HasIndex(x => new { x.AskedByUserId, x.AskedAtUtc });

        builder
            .HasOne(x => x.Game)
            .WithMany()
            .HasForeignKey(x => x.GameId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(x => x.Question)
            .WithMany(x => x.AskedInQuizQuestionSessions)
            .HasForeignKey(x => x.QuestionId)
            .HasConstraintName("fk_quiz_question_sessions_question")
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(x => x.EnabledQuestion)
            .WithMany()
            .HasForeignKey(x => new { x.GameId, x.QuestionId })
            .HasPrincipalKey(x => new { x.GameId, x.QuestionId })
            .HasConstraintName("fk_game_quiz_question_sessions_enabled_question")
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(x => x.AskedByUser)
            .WithMany(x => x.AskedGameQuizQuestionSessions)
            .HasForeignKey(x => x.AskedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

    }
}
