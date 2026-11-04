using System.Text.Json;
using backend.Api.Contracts;
using backend.Api.Http;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Auth;
using backend.Application.Contracts;
using backend.Application.Media;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/game/questions")]
[Authorize(Roles = AuthRoleCodes.Admin)]
public sealed class QuizScreenshotController(IQuizScreenshotService service) : ControllerBase
{
    [HttpGet("hunt-maps")]
    public async Task<IActionResult> GetMaps(CancellationToken cancellationToken)
    {
        var maps = await service.GetMapsAsync(cancellationToken);
        return Ok(maps.Select(map => new HuntMapItemDto(map.Id.ToString(), map.Code, map.Names,
            map.Locations.Select(location => new HuntLocationItemDto(location.Id.ToString(), location.Code,
                location.Names)).ToArray())).ToArray());
    }

    [HttpPost("screenshots")]
    [Consumes("multipart/form-data")]
    [RequestFormLimits(MultipartBodyLengthLimit = ImageUploadLimits.MaxUploadBytes + 65536)]
    [RequestSizeLimit(ImageUploadLimits.MaxUploadBytes + 65536)]
    public async Task<IActionResult> Upload([FromForm] Guid requestId, [FromForm] Guid? locationId,
        [FromForm] Guid categoryId, [FromForm] int reward, [FromForm] int priority,
        [FromForm] bool isEnabled, [FromForm] string text, [FromForm] string? options,
        IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length <= 0 || file.Length > ImageUploadLimits.MaxUploadBytes)
            return this.BadRequestError(AppMessages.Client.GameQuestionInvalidRequest,
                AppMessages.ErrorCodes.GameQuestionInvalidScreenshot);
        GameQuestionOptionInputDto[]? choices = null;
        if (options is not null)
        {
            try
            {
                choices = JsonSerializer.Deserialize<GameQuestionOptionInputDto[]>(options, JsonSerializerOptions.Web);
            }
            catch (JsonException)
            {
                return this.BadRequestError(AppMessages.Client.GameQuestionInvalidRequest,
                    AppMessages.ErrorCodes.GameQuestionInvalidRequest);
            }
            if (choices is null || choices.Any(choice => choice is null))
                return this.BadRequestError(AppMessages.Client.GameQuestionInvalidRequest,
                    AppMessages.ErrorCodes.GameQuestionInvalidRequest);
        }
        await using var content = file.OpenReadStream();
        var result = await service.UploadAsync(new UploadQuizScreenshotInput(requestId, locationId, categoryId,
            reward, priority, isEnabled, text,
            choices?.Select(choice => new GameQuestionOptionInput(choice.Text ?? string.Empty, choice.IsCorrect)).ToArray()),
            content, file.ContentType, file.Length, cancellationToken);
        return result.Outcome switch
        {
            UploadQuizScreenshotOutcome.Created or UploadQuizScreenshotOutcome.Existing when result.QuestionId is { } id =>
                Ok(new UploadQuizScreenshotResponseDto(id.ToString())),
            UploadQuizScreenshotOutcome.RequestConflict => this.ConflictError(AppMessages.Client.GameQuestionInvalidRequest,
                AppMessages.ErrorCodes.GameQuestionScreenshotUploadConflict),
            UploadQuizScreenshotOutcome.InvalidFile => this.BadRequestError(AppMessages.Client.GameQuestionInvalidRequest,
                AppMessages.ErrorCodes.GameQuestionInvalidScreenshot),
            _ => this.BadRequestError(AppMessages.Client.GameQuestionInvalidRequest,
                AppMessages.ErrorCodes.GameQuestionInvalidRequest)
        };
    }
}
