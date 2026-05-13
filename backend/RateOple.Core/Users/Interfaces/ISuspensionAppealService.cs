using RateOple.Core.Users.DTOs;

namespace RateOple.Core.Contracts;

public interface ISuspensionAppealService
{
    Task<SuspensionAppealDto> CreateAsync(Guid userId, CreateSuspensionAppealDto dto);
    Task<SuspensionAppealDto> ResolveAsync(Guid actorId, Guid appealId, ResolveSuspensionAppealDto dto);
}
