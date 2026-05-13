using Microsoft.Extensions.Options;
using RateOple.Core.Contracts;
using RateOple.Core.Users.Options;

namespace RateOple.Services;

public sealed class UnconfirmedAccountCleanupHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<UnconfirmedAccountCleanupOptions> _options;
    private readonly ILogger<UnconfirmedAccountCleanupHostedService> _logger;

    public UnconfirmedAccountCleanupHostedService(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<UnconfirmedAccountCleanupOptions> options,
        ILogger<UnconfirmedAccountCleanupHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var options = _options.CurrentValue;
            var interval = TimeSpan.FromMinutes(Math.Max(1, options.IntervalMinutes));

            if (options.Enabled)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var cleanup = scope.ServiceProvider.GetRequiredService<IUnconfirmedAccountCleanupService>();
                    var deleted = await cleanup.CleanupAsync(stoppingToken);
                    if (deleted > 0)
                        _logger.LogInformation("Deleted {DeletedCount} stale unconfirmed account(s).", deleted);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unconfirmed account cleanup failed.");
                }
            }

            await Task.Delay(interval, stoppingToken);
        }
    }
}
