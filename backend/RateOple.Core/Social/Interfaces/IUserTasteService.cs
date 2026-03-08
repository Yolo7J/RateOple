namespace RateOple.Core.Contracts;

public interface IUserTasteService
{
    Task RecalculateForUserAsync(Guid userId);
    Task RecalculateForMediaContextAsync(Guid userId, Guid mediaId);
}
