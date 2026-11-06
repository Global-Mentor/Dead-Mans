using System.ComponentModel.DataAnnotations;
using backend.Api.Contracts;
using backend.Api.Http;
using backend.Api.Mapping;
using backend.Application.Abstractions;
using backend.Application.Configuration;
using backend.Application.Contracts;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace backend.Controllers;

[ApiController]
[Route("api/profile/me")]
[Authorize]
public sealed class UserProfileController(IUserProfileReader profile, IOptions<MediaStorageSettings> media) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        if (HttpContext.TryGetUserId() is not { } userId)
            return this.UnauthorizedError(AppMessages.Client.AuthenticationRequired);
        var result = await profile.GetProfileAsync(userId, cancellationToken);
        return result is null ? this.UnauthorizedError(AppMessages.Client.UserMissingOrInactive)
            : Ok(new UserProfileDto(result.UserId.ToString(), result.Login, result.DisplayName, result.ProfileImageUrl,
                result.PlayerGameCount, result.QuizGameCount, result.AnswerCount, result.CorrectAnswerCount,
                MapStatistics(result.Statistics)));
    }

    [HttpGet("games")]
    [ProducesResponseType(typeof(UserProfileGamesPageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetGames([FromQuery] UserProfileGamesQuery query,
        CancellationToken cancellationToken = default)
    {
        if (HttpContext.TryGetUserId() is not { } userId)
            return this.UnauthorizedError(AppMessages.Client.AuthenticationRequired);
        var result = await profile.GetGamesAsync(userId,
            query.Participation == "quiz" ? UserProfileParticipation.Quiz : UserProfileParticipation.Player,
            query.Page, query.PageSize, cancellationToken);
        if (result is null) return this.UnauthorizedError(AppMessages.Client.UserMissingOrInactive);
        return Ok(new UserProfileGamesPageDto(result.Items.Select(MapGame).ToArray(), result.TotalCount, result.Page, result.PageSize));
    }

    private static UserProfileStatisticsDto MapStatistics(UserProfileStatistics value) => new(
        value.FinishedPlayerGameCount, value.CompletedRoundCount, value.AwardedQuizPoints,
        new(value.Games.PlayedGameCount, value.Games.RankedGameCount, value.Games.WinCount, value.Games.PodiumCount,
            value.Games.BestPlacement, value.Games.TeamCount, value.Games.TeammateCount, value.Games.TotalRoundScore,
            value.Games.BestRoundScore, value.Games.TeamKills, value.Games.TeamBounties, value.Games.AverageRoundScore),
        new(value.Quiz.AnswerCount, value.Quiz.CorrectAnswerCount, value.Quiz.IncorrectAnswerCount,
            new(value.Quiz.Text.AnswerCount, value.Quiz.Text.CorrectAnswerCount, value.Quiz.Text.Points),
            new(value.Quiz.Screenshot.AnswerCount, value.Quiz.Screenshot.CorrectAnswerCount, value.Quiz.Screenshot.Points),
            value.Quiz.LongestCorrectStreak, value.Quiz.MaxCorrectAnswersPerGame, value.Quiz.MaxPointsPerGame,
            value.Quiz.Categories.Select(item => new UserProfileQuizCategoryStatisticsDto(item.Name,
                item.AnswerCount, item.CorrectAnswerCount, item.Points)).ToArray(), value.Quiz.AverageAnswerPoints),
        new(value.Points.ManualAwarded, value.Points.ManualDeducted, value.Points.Spent, value.Points.Refunded, value.Points.NetSpent, value.Points.AveragePaidOrderCost),
        new(value.Modifiers.OrderedCount, value.Modifiers.PaidCount, value.Modifiers.FreeCount, value.Modifiers.AppliedCount,
            value.Modifiers.CancelledCount, value.Modifiers.PendingCount, value.Modifiers.UniqueCount, value.Modifiers.GameCount,
            value.Modifiers.RoundCount, value.Modifiers.MostUsed is { } mostUsed ? new(mostUsed.Name, mostUsed.Count) : null,
            value.Modifiers.Categories.Select(item => new UserProfileModifierCountDto(item.Name, item.Count)).ToArray(),
            value.Modifiers.Outcomes.Select(item => new UserProfileModifierOutcomeCountDto(item.Outcome, item.Count)).ToArray()),
        new(value.Activity.FirstActivityAtUtc, value.Activity.LastActivityAtUtc, value.Activity.ActiveDayCount,
            value.Activity.Months.Select(item => new UserProfileActivityMonthDto(item.Month, item.GameCount,
                item.RoundCount, item.AnswerCount, item.ModifierCount)).ToArray()));

    private static UserProfileGameDto MapGame(UserProfileGame game) => new(game.GameId.ToString(),
        game.Title, game.Status, game.StartedAtUtc, game.FinishedAtUtc, game.CompletedRoundCount,
        game.AnswerCount, game.CorrectAnswerCount);

    [HttpGet("answers")]
    [ProducesResponseType(typeof(UserProfileAnswersPageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAnswers([FromQuery] Guid? gameId = null,
        [FromQuery, Range(1, 1_000_000)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (HttpContext.TryGetUserId() is not { } userId)
            return this.UnauthorizedError(AppMessages.Client.AuthenticationRequired);
        var result = await profile.GetAnswersAsync(userId, gameId, page, pageSize, cancellationToken);
        if (result is null) return this.UnauthorizedError(AppMessages.Client.UserMissingOrInactive);
        return Ok(new UserProfileAnswersPageDto(result.Items.Select(answer => new UserProfileAnswerDto(
            answer.QuestionSessionId.ToString(), answer.QuestionId.ToString(), answer.GameId.ToString(), answer.GameTitle,
            answer.QuestionText, answer.CategoryName, answer.SelectedOptionId.ToString(), answer.SelectedOptionText,
            answer.IsCorrect, answer.AwardedPoints, answer.SubmittedAtUtc, answer.Image?.ToDto(media.Value.PublicBaseUrl))).ToArray(),
            result.TotalCount, result.Page, result.PageSize));
    }
}
