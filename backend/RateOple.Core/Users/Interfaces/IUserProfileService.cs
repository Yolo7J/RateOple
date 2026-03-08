using RateOple.Core.Contracts.DTOs.Users;

namespace RateOple.Core.Contracts;

public interface IUserProfileService
{
    Task<UserProfileDto> GetProfileAsync(Guid userId);
    Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateUserProfileDto dto);
    Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
    Task DeleteAccountAsync(Guid userId, string currentPassword);
}
