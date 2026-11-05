using backend.Application.Contracts;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class ScreenshotQuizTests
{
    [Fact]
    public async Task CatalogPage_SearchesTranslatedGeographyAndKeepsFacetsBeyondCurrentPage()
    {
        await using var db = database.CreateDbContext();
        var input = await InputAsync(db);
        var first = await UploadAsync(Service(db), input);
        var secondLocation = await db.HuntLocations.Where(x => x.Id != input.LocationId).OrderBy(x => x.Id).FirstAsync();
        var second = await UploadAsync(Service(db), input with { RequestId = Guid.NewGuid(), LocationId = secondLocation.Id });
        Assert.Equal(UploadQuizScreenshotOutcome.Created, first.Outcome);
        Assert.Equal(UploadQuizScreenshotOutcome.Created, second.Outcome);
        var name = await db.HuntLocationTranslations.Where(x => x.LocationId == input.LocationId && x.Locale == "pl").Select(x => x.Name).SingleAsync();
        var repository = new DbGameQuestionRepository(db, TimeProvider.System);
        var result = await repository.GetCatalogPageAsync(new(Format: "screenshot", Search: name, LocationId: input.LocationId, PageSize: 1));
        Assert.Single(result.Items);
        Assert.Equal(input.LocationId, result.Items[0].ScreenshotLocationId);
        Assert.Contains(result.Maps.SelectMany(x => x.Locations), x => x.Id == secondLocation.Id);
    }
}
