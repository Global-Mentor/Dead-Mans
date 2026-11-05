namespace backend.Application.Contracts;

public sealed record GameQuestionCatalogFilter(
    string Format = "text", Guid? CategoryId = null, string? Search = null,
    string Status = "all", string Sort = "category", Guid? MapId = null,
    Guid? LocationId = null, int Page = 1, int PageSize = 40);

public sealed record GameQuestionCatalogPage(
    IReadOnlyList<GameQuestionCatalogItem> Items, int TotalCount, int Page, int PageSize,
    IReadOnlyList<HuntMapItem> Maps);
