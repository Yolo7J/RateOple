namespace RateOple.Core.Contracts;

public interface IFollowService
{
    Task FollowAsync(Guid followerId, Guid followingId);
    Task UnfollowAsync(Guid followerId, Guid followingId);

    Task<bool> IsFollowingAsync(Guid followerId, Guid followingId);
    Task<int> GetFollowersCountAsync(Guid userId);
    Task<int> GetFollowingCountAsync(Guid userId);
}

