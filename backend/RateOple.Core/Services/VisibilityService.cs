using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Core.Contarcts;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Core.Services
{
    public class VisibilityService : IVisibilityService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<User> _userManager;

        public VisibilityService(
            ApplicationDbContext context,
            UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public Task<bool> CanViewCollectionAsync(Guid viewerId, Guid collectionId)
        {
            throw new NotImplementedException();
        }

        public async Task<bool> CanViewUserAsync(Guid viewerId, Guid targetUserId)
        {
            // Self access
            if (viewerId == targetUserId)
                return true;

            // Admin / SuperAdmin bypass
            var viewer = await _userManager.FindByIdAsync(viewerId.ToString());
            if (viewer != null &&
                (await _userManager.IsInRoleAsync(viewer, RoleConstants.Admin) ||
                 await _userManager.IsInRoleAsync(viewer, RoleConstants.SuperAdmin)))
            {
                return true;
            }

            // Target user
            var target = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == targetUserId);

            if (target == null)
                return false;

            // Public profile
            if (target.Visibility == UserVisibility.Public)
                return true;

            // Private profile → followers only
            return await _context.Follows.AnyAsync(f =>
                f.FollowerId == viewerId &&
                f.FollowingId == targetUserId);
        }
    }
}
