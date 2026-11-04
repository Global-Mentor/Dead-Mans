namespace backend.Application.Contracts;

public static class QuestionCatalogDefaults
{
    public static readonly Guid UncategorizedCategoryId =
        Guid.Parse("00000000-0000-0000-0000-000000000001");

    public static readonly Guid UncategorizedScreenshotCategoryId =
        Guid.Parse("00000000-0000-0000-0000-000000000002");

    public const string UncategorizedCategoryName = "БЕЗ КАТЕГОРИИ";

    public static readonly Guid LocationScreenshotCategoryId =
        Guid.Parse("00000000-0000-0000-0000-000000000003");
}
