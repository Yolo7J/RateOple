namespace RateOple.Core.Contracts;

public interface IUnconfirmedAccountCleanupService
{
    Task<int> CleanupAsync(CancellationToken cancellationToken = default);
}
