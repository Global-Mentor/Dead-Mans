using backend.Application.Configuration;
using Microsoft.Extensions.Options;
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
using System.Text;
using System.Text.Json;

namespace backend.Controllers;

[ApiController]
[Route("api/game/questions")]
[Authorize]
public sealed partial class GameQuestionController : ControllerBase
{
    private static readonly JsonSerializerOptions ImportJsonOptions = new()
    {
        AllowTrailingCommas = true,
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip
    };

    private readonly IGameQuestionService _gameQuestionService;

    private readonly string _mediaBaseUrl;

    public GameQuestionController(IGameQuestionService gameQuestionService, IOptions<MediaStorageSettings> media)
    {
        _gameQuestionService = gameQuestionService;
        _mediaBaseUrl = media.Value.PublicBaseUrl;
    }
}
