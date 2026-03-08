import { useCallback } from 'react';
import * as mediaService from '../services/mediaService';
import tmdbService from '../services/tmdbService';
import * as tvSeriesService from '../services/tvSeriesService';

export const useMediaCommands = () => {
  const getGenres = useCallback(() => mediaService.getGenres(), []);
  const searchBooks = useCallback((query) => mediaService.searchBooks(query), []);
  const getBookDetails = useCallback((olId) => mediaService.getBookDetails(olId), []);
  const getTmdbSeriesDetails = useCallback((tmdbId) => mediaService.getTmdbSeriesDetails(tmdbId), []);
  const searchTmdb = useCallback((query, type) => tmdbService.search(query, type), []);
  const getTmdbDetails = useCallback((tmdbId, type) => tmdbService.getDetails(tmdbId, type), []);
  const bulkCreateMedia = useCallback((items) => mediaService.bulkCreateMedia(items), []);

  const getSeasons = useCallback((mediaId) => tvSeriesService.getSeasons(mediaId), []);
  const addSeason = useCallback((mediaId, dto) => tvSeriesService.addSeason(mediaId, dto), []);
  const updateSeason = useCallback((mediaId, seasonNumber, dto) => tvSeriesService.updateSeason(mediaId, seasonNumber, dto), []);
  const deleteSeason = useCallback((mediaId, seasonNumber) => tvSeriesService.deleteSeason(mediaId, seasonNumber), []);
  const addEpisode = useCallback((mediaId, seasonNumber, dto) => tvSeriesService.addEpisode(mediaId, seasonNumber, dto), []);
  const updateEpisode = useCallback((mediaId, seasonNumber, episodeNumber, dto) => tvSeriesService.updateEpisode(mediaId, seasonNumber, episodeNumber, dto), []);
  const deleteEpisode = useCallback((mediaId, seasonNumber, episodeNumber) => tvSeriesService.deleteEpisode(mediaId, seasonNumber, episodeNumber), []);

  return {
    searchBooks,
    getGenres,
    getBookDetails,
    getTmdbSeriesDetails,
    searchTmdb,
    getTmdbDetails,
    bulkCreateMedia,
    getSeasons,
    addSeason,
    updateSeason,
    deleteSeason,
    addEpisode,
    updateEpisode,
    deleteEpisode,
  };
};
