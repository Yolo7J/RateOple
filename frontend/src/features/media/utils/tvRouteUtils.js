export const normalizeNumberParam = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getTvSeasons = (media, seasonsData) => {
  if (Array.isArray(seasonsData) && seasonsData.length) return seasonsData;
  if (Array.isArray(media?.seasons)) return media.seasons;
  return [];
};

export const findSeasonByNumber = (seasons, seasonNumber) => {
  if (!seasonNumber) return null;
  return seasons.find((season) => Number(season.seasonNumber) === seasonNumber) ?? null;
};

export const findEpisodeByNumber = (season, episodeNumber) => {
  if (!season || !episodeNumber) return null;
  const episodes = Array.isArray(season.episodes) ? season.episodes : [];
  return episodes.find((episode) => Number(episode.episodeNumber) === episodeNumber) ?? null;
};
