using backend.Domain.Questions;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Application.Contracts;
using backend.Domain.GameModifiers;

namespace backend.Api.Mapping;

public static partial class ApiContractMapper
{
    public static GameQuizImageDto ToDto(this QuizImageSnapshot image, string mediaBaseUrl) => new(
        $"{mediaBaseUrl.TrimEnd('/')}/{image.MediaPath}", image.MapNames,
        image.OptionNames.OrderBy(x => x.Key).ToDictionary(x => x.Key.ToString(), x => x.Value))
    { ThumbnailUrl = image.ThumbnailPath is { } path ? $"{mediaBaseUrl.TrimEnd('/')}/{path}" : null };

    public static CreateGameQuestionInput ToInput(
        this CreateGameQuestionRequestDto request,
        Guid categoryId
    )
    {
        return new CreateGameQuestionInput(
            request.ExternalCode,
            categoryId,
            request.Text ?? string.Empty,
            (request.Options ?? Array.Empty<GameQuestionOptionInputDto>())
                .Select(MapQuestionOptionInput)
                .ToArray(),
            request.Reward,
            request.IsEnabled,
            request.Priority
        );
    }

    public static ImportGameQuestionInput ToInput(
        this ImportGameQuestionRequestDto request,
        int rowNumber,
        Guid categoryId
    )
    {
        return new ImportGameQuestionInput(
            rowNumber,
            categoryId,
            request.Text,
            (request.Options ?? Array.Empty<GameQuestionOptionInputDto>())
                .Select(MapQuestionOptionInput)
                .ToArray(),
            request.Reward,
            request.ExternalCode,
            request.IsEnabled,
            request.Priority,
            request.ToSource()
        );
    }

    public static ImportGameQuestionSource ToSource(this ImportGameQuestionRequestDto request)
    {
        return new ImportGameQuestionSource(
            request.Text,
            request.Options?.Select(MapQuestionOptionInput)
                .ToArray(),
            request.Reward,
            request.CategoryId,
            request.ExternalCode,
            request.IsEnabled,
            request.Priority
        );
    }

    public static UpdateGameQuestionInput ToInput(
        this UpdateGameQuestionRequestDto request,
        Guid categoryId
    )
    {
        return new UpdateGameQuestionInput(
            categoryId,
            request.Text ?? string.Empty,
            (request.Options ?? Array.Empty<GameQuestionOptionInputDto>())
                .Select(MapQuestionOptionInput)
                .ToArray(),
            request.Reward,
            request.IsEnabled,
            request.Priority
        );
    }

    // Preserve invalid entries as empty options so validation rejects the whole
    // question instead of silently dropping malformed choices from an import.
    private static GameQuestionOptionInput MapQuestionOptionInput(GameQuestionOptionInputDto? option) =>
        new(option?.Text ?? string.Empty, option?.IsCorrect ?? false);

    public static GameQuestionCatalogItemDto ToDto(this GameQuestionCatalogItem item, string mediaBaseUrl)
    {
        return new GameQuestionCatalogItemDto(
            item.QuestionId.ToString(),
            item.QuestionCode,
            item.CategoryId.ToString(),
            item.CategoryName,
            item.Text,
            item.Options.Select(option => new GameQuestionOptionDto(
                option.OptionId.ToString(),
                option.Text,
                option.IsCorrect,
                option.SortOrder
            )).ToArray(),
            item.Reward,
            item.Priority,
            item.IsEnabled,
            item.AskedTotalCount,
            item.SubmissionTotalCount,
            item.CorrectSubmissionTotalCount,
            item.CorrectPercentage,
            item.LastAskedAtUtc,
            item.TwitchPreview.IsCompatible,
            item.TwitchPreview.ErrorCode
        )
        { Image = item.Image?.ToDto(mediaBaseUrl), ScreenshotMapId = item.ScreenshotMapId?.ToString(), ScreenshotLocationId = item.ScreenshotLocationId?.ToString() };
    }

    public static AskedQuizQuestionDto ToDto(this AskedQuizQuestion question, string mediaBaseUrl)
    {
        return new AskedQuizQuestionDto(
            question.QuestionSessionId.ToString(),
            question.GameId.ToString(),
            question.AskOrder,
            question.QuestionId.ToString(),
            question.QuestionCode,
            question.CategoryName,
            question.Text,
            question.Options.Select(option => new GameQuizOptionDto(
                option.OptionId.ToString(),
                option.Text,
                option.DisplayOrder
            )).ToArray(),
            question.Reward,
            question.AskedAtUtc,
            question.ClosesAtUtc
        )
        { Image = question.Image?.ToDto(mediaBaseUrl) };
    }

    public static GameQuestionCategoryItemDto ToDto(this GameQuestionCategoryItem item)
    {
        return new GameQuestionCategoryItemDto(
            item.Id.ToString(),
            item.Name,
            item.QuestionCount,
            item.IsProtected
        )
        { IsLocationCategory = item.IsLocationCategory };
    }

    public static ImportGameQuestionSkippedItemDto ToDto(this ImportGameQuestionSkippedItem item)
    {
        return new ImportGameQuestionSkippedItemDto(
            item.RowNumber,
            item.QuestionText,
            item.ReasonCode,
            item.Reason,
            item.SourceQuestion?.ToDto()
        );
    }

    public static ImportGameQuestionSourceDto ToDto(this ImportGameQuestionSource source)
    {
        return new ImportGameQuestionSourceDto(
            source.Text,
            source.Options?.Select(option => new GameQuestionOptionInputDto(
                option.Text,
                option.IsCorrect
            )).ToArray(),
            source.Reward,
            source.CategoryId,
            source.ExternalCode,
            source.IsEnabled,
            source.Priority
        );
    }


    public static GameQuizSubmissionReceiptDto ToDto(this GameQuizSubmissionReceipt receipt) => new(
        receipt.SubmissionId.ToString(),
        receipt.QuestionSessionId.ToString(),
        receipt.UserId.ToString(),
        receipt.SelectedOptionId.ToString(),
        receipt.SubmittedAtUtc,
        receipt.IsExisting
    );

    public static AvailableGameQuizQuestionDto ToDto(this AvailableGameQuizQuestion question, string mediaBaseUrl) => new(
        question.QuestionId.ToString(),
        question.QuestionCode,
        question.CategoryName,
        question.Text
    )
    { Image = question.Image?.ToDto(mediaBaseUrl) };

    public static CurrentGameQuizStateDto ToDto(this CurrentGameQuizState state, string mediaBaseUrl) => new(
        state.QuestionSessionId.ToString(),
        state.GameId.ToString(),
        state.AskOrder,
        state.QuestionId.ToString(),
        state.QuestionCode,
        state.CategoryName,
        state.Text,
        state.Options.Select(option => new GameQuizOptionDto(
            option.OptionId.ToString(),
            option.Text,
            option.DisplayOrder
        )).ToArray(),
        state.Reward,
        state.Status,
        state.AskedAtUtc,
        state.ClosesAtUtc,
        state.ClosedAtUtc,
        state.MySelectedOptionId?.ToString(),
        state.MySubmittedAtUtc,
        state.CorrectOptionId?.ToString(),
        state.MyIsCorrect,
        state.MyAwardedPoints,
        state.TotalSubmissions,
        state.OptionResults?.Select(result => new GameQuizOptionResultDto(
            result.OptionId.ToString(),
            result.AnswerCount,
            result.Percentage
        )).ToArray()
    )
    { Image = state.Image?.ToDto(mediaBaseUrl), PresentationVisible = state.PresentationVisible, ServerNowUtc = state.ServerNowUtc };

    public static ManualQuizAwardSummaryDto ToDto(this ManualQuizAwardSummary award)
    {
        return new ManualQuizAwardSummaryDto(
            award.AwardId.ToString(),
            award.GameId.ToString(),
            award.AwardedToUserId.ToString(),
            award.AwardedToDisplayName,
            award.AwardedByUserId.ToString(),
            award.AwardedByDisplayName,
            award.OperationType,
            award.PointsDelta,
            award.Reason,
            award.AvailablePointsBefore,
            award.AvailablePointsAfter,
            award.RequestId.ToString(),
            award.AwardedAtUtc
        );
    }

    public static GameQuizStateChangedEventDto ToDto(this GameQuizStateChangedEvent @event)
    {
        return new GameQuizStateChangedEventDto(
            @event.GameId.ToString(),
            @event.ChangeKind,
            @event.OccurredAtUtc
        );
    }

    public static GameRoundStateChangedEventDto ToDto(this GameRoundStateChangedEvent @event)
    {
        return new GameRoundStateChangedEventDto(
            @event.GameId.ToString(),
            @event.RoundId.ToString(),
            @event.Status,
            @event.RoundVersion,
            @event.OccurredAtUtc
        );
    }

    public static ManualQuizAwardPlayerDto ToDto(this ManualQuizAwardPlayer player)
    {
        return new ManualQuizAwardPlayerDto(
            player.UserId.ToString(),
            player.Login,
            player.DisplayName,
            player.EarnedQuizPoints,
            player.SpentQuizPoints,
            player.AvailableQuizPoints
        );
    }

}
