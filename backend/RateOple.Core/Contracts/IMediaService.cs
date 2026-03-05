using RateOple.Core.Contracts.DTOs.Media;

namespace RateOple.Core.Contracts;

public interface IMediaService
{
    // ── Read ──────────────────────────────────────────────────────────────────
    Task<PagedResultDto<MediaListItemDto>> GetAllAsync(MediaQueryDto query);
    Task<MediaDetailDto?> GetByIdAsync(Guid id);
    Task<List<GenreDto>> GetGenresAsync();

    // ── Single create ─────────────────────────────────────────────────────────
    Task<MediaDetailDto> CreateMovieAsync(CreateMovieDto dto);
    Task<MediaDetailDto> CreateBookAsync(CreateBookDto dto);
    Task<MediaDetailDto> CreateTvSeriesAsync(CreateTvSeriesDto dto);

    // ── Bulk create (cart) ────────────────────────────────────────────────────
    Task<BulkCreateResultDto> BulkCreateAsync(BulkCreateDto dto);

    // ── Third-party search proxies ────────────────────────────────────────────
    Task<List<OlSearchResultDto>> SearchBooksAsync(string query);
    Task<OlDetailsDto?> GetBookDetailsAsync(string olId);
}

public class GenreDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
}