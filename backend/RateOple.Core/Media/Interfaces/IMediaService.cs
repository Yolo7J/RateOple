using RateOple.Core.Media.DTOs;

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

    // ── Update ────────────────────────────────────────────────────────────────
    Task<MediaDetailDto> UpdateMovieAsync(Guid id, UpdateMovieDto dto);
    Task<MediaDetailDto> UpdateBookAsync(Guid id, UpdateBookDto dto);
    Task<MediaDetailDto> UpdateTvSeriesAsync(Guid id, UpdateTvSeriesDto dto);

    // ── Soft delete ───────────────────────────────────────────────────────────
    Task SoftDeleteAsync(Guid id);

    // ── Bulk create ───────────────────────────────────────────────────────────
    Task<BulkCreateResultDto> BulkCreateAsync(BulkCreateDto dto);

    // ── Open Library proxy ────────────────────────────────────────────────────
    Task<List<OlSearchResultDto>> SearchBooksAsync(string query);
    Task<OlDetailsDto?> GetBookDetailsAsync(string olId);
}

public class GenreDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
}