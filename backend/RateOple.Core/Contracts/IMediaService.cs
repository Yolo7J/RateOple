using RateOple.Core.DTOs;

namespace RateOple.Core.Contracts;

public interface IMediaService
{
    Task<IReadOnlyList<MediaListDto>> GetAllAsync();
    Task<MediaDetailsDto?> GetByIdAsync(Guid id);
}
