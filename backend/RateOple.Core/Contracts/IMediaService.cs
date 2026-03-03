using RateOple.Core.Contracts.DTOs.Media;

namespace RateOple.Core.Contracts;

public interface IMediaService
{
    Task<PagedResultDto<MediaListItemDto>> GetAllAsync(MediaQueryDto query);
    Task<MediaDetailDto?> GetByIdAsync(Guid id);
    Task<MediaDetailDto> CreateMovieAsync(CreateMovieDto dto);
    Task<MediaDetailDto> CreateBookAsync(CreateBookDto dto);
    Task<MediaDetailDto> CreateTvSeriesAsync(CreateTvSeriesDto dto);
    Task<List<GenreDto>> GetGenresAsync();
}

public class GenreDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
}