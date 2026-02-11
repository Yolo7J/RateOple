using Microsoft.EntityFrameworkCore;
using RateOple.Core.Contracts;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Core.Services
{
    public class FollowService : IFollowService
    {
        private readonly ApplicationDbContext _context;

        public FollowService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task FollowAsync(Guid followerId, Guid followingId)
        {
            if (followerId == followingId)
                throw new InvalidOperationException("Cannot follow yourself.");

            var exists = await _context.Follows
                .AnyAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);

            if (exists)
            return;

            var follow = new Follow
            {
                FollowerId = followerId,
                FollowingId = followingId
            };

            _context.Follows.Add(follow);
            await _context.SaveChangesAsync();
        }

        public async Task UnfollowAsync(Guid followerId, Guid followingId)
        {
            var follow = await _context.Follows
                .FirstOrDefaultAsync(f =>
                    f.FollowerId == followerId &&
                    f.FollowingId == followingId);

            if (follow == null)
                return;

            _context.Follows.Remove(follow);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> IsFollowingAsync(Guid followerId, Guid followingId)
        {
            return await _context.Follows
                .AnyAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);
        }

        public async Task<int> GetFollowersCountAsync(Guid userId)
        {
            return await _context.Follows
                .CountAsync(f => f.FollowingId == userId);
        }

        public async Task<int> GetFollowingCountAsync(Guid userId)
        {
            return await _context.Follows
                .CountAsync(f => f.FollowerId == userId);
        }
    }
}
