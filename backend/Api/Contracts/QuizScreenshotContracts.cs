namespace backend.Api.Contracts;

public sealed record HuntLocationItemDto(string Id, string Code, IReadOnlyDictionary<string, string> Names);
public sealed record HuntMapItemDto(string Id, string Code, IReadOnlyDictionary<string, string> Names,
    IReadOnlyList<HuntLocationItemDto> Locations);
public sealed record UploadQuizScreenshotResponseDto(string QuestionId);
