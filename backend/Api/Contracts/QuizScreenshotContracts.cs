namespace backend.Api.Contracts;

public sealed record HuntLocationItemDto(string Id, string Code, IReadOnlyDictionary<string, string> Names);
public sealed record HuntMapItemDto(string Id, string Code, IReadOnlyDictionary<string, string> Names,
    IReadOnlyList<HuntLocationItemDto> Locations);
public sealed record UploadQuizScreenshotResponseDto(string QuestionId);
public sealed record ValidateQuizScreenshotRequestDto(Guid CategoryId, Guid? LocationId, string? Text,
    int Reward, int Priority, bool IsEnabled, IReadOnlyList<GameQuestionOptionInputDto>? Options);
