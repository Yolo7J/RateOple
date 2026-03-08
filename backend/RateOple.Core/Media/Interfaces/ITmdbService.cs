using RateOple.Core.Media.DTOs;

namespace RateOple.Core.Contracts;

public interface ITmdbService
{
    Task<List<TmdbSearchResultDto>> SearchAsync(string query, string type);
    Task<TmdbDetailsDto?> GetDetailsAsync(int tmdbId, string type);
    Task<TmdbSeriesDetailsDto?> GetSeriesDetailsAsync(int tmdbId);
}