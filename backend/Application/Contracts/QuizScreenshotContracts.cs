namespace backend.Application.Contracts;

public sealed record HuntLocationItem(Guid Id, string Code, IReadOnlyDictionary<string, string> Names);
public sealed record HuntMapItem(Guid Id, string Code, IReadOnlyDictionary<string, string> Names,
    IReadOnlyList<HuntLocationItem> Locations);
public sealed record UploadQuizScreenshotInput(Guid RequestId, Guid LocationId, Guid CategoryId,
    int Reward, int Priority, bool IsEnabled, string Text);
public enum UploadQuizScreenshotOutcome { Created, Existing, InvalidFile, InvalidSelection, RequestConflict }
public sealed record UploadQuizScreenshotResult(UploadQuizScreenshotOutcome Outcome, Guid? QuestionId = null);
