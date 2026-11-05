using System.Text;
using System.Text.Json;
using backend.Api.Contracts;
using backend.Api.Http;
using backend.Api.Mapping;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Auth;
using backend.Application.Contracts;
using backend.Application.Features.GameQuestions;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

public sealed partial class GameQuestionController
{
    [HttpGet("catalog/page")]
    [Authorize(Roles = AuthRoleCodes.Admin)]
    [ProducesResponseType(typeof(GameQuestionCatalogPageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetCatalogPage(
        [FromQuery] string format = "text", [FromQuery] Guid? categoryId = null,
        [FromQuery] string? search = null, [FromQuery] string status = "all",
        [FromQuery] string sort = "category", [FromQuery] Guid? mapId = null,
        [FromQuery] Guid? locationId = null, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 40, CancellationToken cancellationToken = default)
    {
        if (format is not ("text" or "screenshot") || status is not ("all" or "enabled" or "disabled")
            || sort is not ("category" or "rewardAsc" or "rewardDesc" or "priorityAsc" or "priorityDesc" or "leastAsked")
            || page < 1 || page > 1_000_000 || pageSize is < 1 or > 100 || search?.Length > 200)
            return this.BadRequestError(AppMessages.Client.GameQuestionInvalidRequest, AppMessages.ErrorCodes.GameQuestionInvalidRequest);

        var result = await _gameQuestionService.GetCatalogPageAsync(
            new(format, categoryId, search, status, sort, mapId, locationId, page, pageSize), cancellationToken);
        return Ok(new GameQuestionCatalogPageDto(
            result.Items.Select(x => x.ToDto(_mediaBaseUrl)).ToArray(), result.TotalCount, result.Page, result.PageSize,
            result.Maps.Select(map => new HuntMapItemDto(map.Id.ToString(), map.Code, map.Names,
                map.Locations.Select(location => new HuntLocationItemDto(location.Id.ToString(), location.Code, location.Names)).ToArray())).ToArray()));
    }

    [HttpGet("catalog")]
    [Authorize(Roles = AuthRoleCodes.Admin)]
    [ProducesResponseType(typeof(IReadOnlyList<GameQuestionCatalogItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetCatalog(
        [FromQuery] Guid? categoryId,
        [FromQuery] string? search,
        [FromQuery] bool includeDisabled = true,
        CancellationToken cancellationToken = default
    )
    {
        var catalog = await _gameQuestionService.GetCatalogAsync(
            categoryId,
            search,
            includeDisabled,
            cancellationToken
        );
        return Ok(catalog.Select(x => x.ToDto(_mediaBaseUrl)).ToArray());
    }

    [HttpGet("categories")]
    [Authorize(Roles = AuthRoleCodes.Admin)]
    [ProducesResponseType(typeof(IReadOnlyList<GameQuestionCategoryItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetCategories([FromQuery] string format = "text", CancellationToken cancellationToken = default)
    {
        if (format is not ("text" or "screenshot"))
            return this.BadRequestError(AppMessages.Client.GameQuestionInvalidRequest, AppMessages.ErrorCodes.GameQuestionInvalidRequest);
        var categories = await _gameQuestionService.GetCategoriesAsync(format, cancellationToken);
        return Ok(categories.Select(x => x.ToDto()).ToArray());
    }

    [HttpPost("categories")]
    [Authorize(Roles = AuthRoleCodes.Admin)]
    [ProducesResponseType(typeof(GameQuestionCategoryItemDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(GameQuestionCategoryItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateCategory(
        [FromBody] CreateGameQuestionCategoryRequestDto? request,
        CancellationToken cancellationToken,
        [FromQuery] string format = "text"
    )
    {
        if (request is null || format is not ("text" or "screenshot"))
        {
            return this.BadRequestError(
                AppMessages.Client.GameQuestionInvalidRequest,
                AppMessages.ErrorCodes.GameQuestionInvalidRequest
            );
        }

        var result = await _gameQuestionService.CreateCategoryAsync(request.Name, format, cancellationToken);
        return result.Outcome switch
        {
            CreateGameQuestionCategoryOutcome.Created when result.Category is not null =>
                CreatedAtAction(nameof(GetCategories), new { format }, result.Category.ToDto()),
            CreateGameQuestionCategoryOutcome.Existing when result.Category is not null =>
                Ok(result.Category.ToDto()),
            _ => this.BadRequestError(
                AppMessages.Client.GameQuestionInvalidRequest,
                AppMessages.ErrorCodes.GameQuestionInvalidRequest
            )
        };
    }
}
