using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace RateOple.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    public override Task OnConnectedAsync()
    {
        if (Context.UserIdentifier is null)
        {
            Context.Abort();
            return Task.CompletedTask;
        }

        return base.OnConnectedAsync();
    }
}
