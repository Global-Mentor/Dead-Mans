namespace backend.Api.Contracts;

public sealed record GameQuestionCatalogPageDto(
    IReadOnlyList<GameQuestionCatalogItemDto> Items, int TotalCount, int Page, int PageSize,
    IReadOnlyList<HuntMapItemDto> Maps);
