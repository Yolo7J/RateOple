using System.Security.Claims;

namespace RateOple.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetUserIdOrNull(this ClaimsPrincipal user)
    {
        var claim = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var userId) ? userId : null;
    }

    public static Guid GetRequiredUserId(this ClaimsPrincipal user)
    {
        return user.GetUserIdOrNull()
            ?? throw new UnauthorizedAccessException("Authenticated user id claim is missing or invalid.");
    }

    public static string? GetUsernameOrNull(this ClaimsPrincipal user)
    {
        return user.Identity?.Name
            ?? user.FindFirstValue(ClaimTypes.Name)
            ?? user.FindFirstValue("name")
            ?? user.FindFirstValue("preferred_username");
    }
}
