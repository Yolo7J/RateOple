using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace RateOple.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    public const string ModerationGroup = "moderation";

    public override async Task OnConnectedAsync()
    {
        if (Context.UserIdentifier is null)
        {
            Context.Abort();
            return;
        }

        if (IsModerator(Context.User))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, ModerationGroup);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (IsModerator(Context.User))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, ModerationGroup);
        }

        await base.OnDisconnectedAsync(exception);
    }

    private static bool IsModerator(System.Security.Claims.ClaimsPrincipal? user)
    {
        return user?.IsInRole("Admin") == true ||
               user?.IsInRole("SuperAdmin") == true ||
               user?.IsInRole("Moderator") == true;
    }
}
