using System.Security.Claims;

namespace backend.Api.Http;

public static class UserIdRequestExtensions
{
    public static Guid? TryGetUserId(this HttpContext httpContext)
    {
        var raw = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var userId) ? userId : null;
    }
}
