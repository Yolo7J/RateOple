using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Contracts;

public interface IAccountEmailService
{
    Task SendConfirmationAsync(User user, CancellationToken cancellationToken = default);
    Task SendPasswordResetAsync(User user, CancellationToken cancellationToken = default);
}
