using RateOple.Core.Users.DTOs;

namespace RateOple.Core.Contracts;

public interface IUserMediaStatusService
{
    Task<UserMediaStatusDto> SetStatusAsync(Guid userId, Guid mediaId, SetUserMediaStatusDto dto);
    Task<IReadOnlyList<UserMediaStatusDto>> GetUserStatusesAsync(Guid userId, MediaStatusQueryDto query);
}
