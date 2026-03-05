using RateOple.Core.Contracts.DTOs.Media;

namespace RateOple.Core.Contracts;

public interface ITvSeriesService
{
    // ── Seasons ───────────────────────────────────────────────────────────────

    /// <summary>Get all non-deleted seasons (with episodes) for a TvSeries.</summary>
    Task<List<SeasonDetailDto>> GetSeasonsAsync(Guid mediaId);

    /// <summary>
    /// Add a new season to an existing TvSeries.
    /// Throws if the series doesn't exist or SeasonNumber already exists.
    /// </summary>
    Task<SeasonDetailDto> AddSeasonAsync(Guid mediaId, UpsertSeasonDto dto);

    /// <summary>
    /// Patch an existing season: updates only episodes present in the DTO
    /// (matched by EpisodeNumber). New episodes are inserted.
    /// Returns the updated season.
    /// </summary>
    Task<SeasonDetailDto> UpdateSeasonAsync(Guid mediaId, int seasonNumber, UpsertSeasonDto dto);

    /// <summary>Soft-delete a season and all its episodes.</summary>
    Task DeleteSeasonAsync(Guid mediaId, int seasonNumber);

    // ── Episodes ──────────────────────────────────────────────────────────────

    /// <summary>Add a single episode to a season.</summary>
    Task<EpisodeDetailDto> AddEpisodeAsync(Guid mediaId, int seasonNumber, UpsertEpisodeDto dto);

    /// <summary>
    /// Patch an existing episode (matched by EpisodeNumber).
    /// Only non-null fields in the DTO are applied.
    /// </summary>
    Task<EpisodeDetailDto> UpdateEpisodeAsync(Guid mediaId, int seasonNumber, int episodeNumber, UpsertEpisodeDto dto);

    /// <summary>Soft-delete a single episode.</summary>
    Task DeleteEpisodeAsync(Guid mediaId, int seasonNumber, int episodeNumber);
}