using System.Net.Http.Json;
using backend.Api.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Support;

internal static class PublicationTestData
{
    public static async Task AddMediaAsync(ApplicationDbContext db, Guid gameId)
    {
        var cells = await db.BoardCells.Where(cell => cell.Board.GameId == gameId && !cell.MediaLinks.Any()).ToListAsync();
        foreach (var cell in cells)
        {
            db.BoardCellMedia.Add(new BoardCellMedia
            {
                Id = Guid.NewGuid(),
                CellId = cell.Id,
                MediaAsset = new MediaAsset
                {
                    Id = Guid.NewGuid(),
                    Bucket = "test",
                    ObjectKey = $"publication/{cell.Id}.png",
                    MimeType = "image/png",
                    SizeBytes = 100,
                    CreatedAtUtc = DateTime.UtcNow
                }
            });
        }
        await db.SaveChangesAsync();
    }

    public static async Task<HttpResponseMessage> OpenPreparedDraftAsync(IServiceProvider services, HttpClient client)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var game = await db.Games.Include(game => game.Board).SingleAsync(game => game.Status == GameStatusValue.Draft && !game.IsDeleted);
        await AddMediaAsync(db, game.Id);
        return await client.PostAsJsonAsync("/api/game/lifecycle/open-registration",
            new OpenGameRegistrationRequestDto(game.Id, game.Board!.Version, true, true));
    }
}
