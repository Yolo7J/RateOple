import api from "../../../services/api";

// ── Seasons ───────────────────────────────────────────────────────────────────

/** GET /api/media/:id/seasons — all non-deleted seasons with episodes */
export const getSeasons = (mediaId) =>
  api.get(`/media/${mediaId}/seasons`).then((r) => r.data);

/** POST /api/media/:id/seasons — add a new season */
export const addSeason = (mediaId, dto) =>
  api.post(`/media/${mediaId}/seasons`, dto).then((r) => r.data);

/** PUT /api/media/:id/seasons/:seasonNumber — patch season episodes */
export const updateSeason = (mediaId, seasonNumber, dto) =>
  api.put(`/media/${mediaId}/seasons/${seasonNumber}`, dto).then((r) => r.data);

/** DELETE /api/media/:id/seasons/:seasonNumber — soft delete season */
export const deleteSeason = (mediaId, seasonNumber) =>
  api.delete(`/media/${mediaId}/seasons/${seasonNumber}`);

// ── Episodes ──────────────────────────────────────────────────────────────────

/** POST /api/media/:id/seasons/:n/episodes — add episode */
export const addEpisode = (mediaId, seasonNumber, dto) =>
  api.post(`/media/${mediaId}/seasons/${seasonNumber}/episodes`, dto).then((r) => r.data);

/** PUT /api/media/:id/seasons/:n/episodes/:n — patch episode */
export const updateEpisode = (mediaId, seasonNumber, episodeNumber, dto) =>
  api
    .put(`/media/${mediaId}/seasons/${seasonNumber}/episodes/${episodeNumber}`, dto)
    .then((r) => r.data);

/** DELETE /api/media/:id/seasons/:n/episodes/:n — soft delete episode */
export const deleteEpisode = (mediaId, seasonNumber, episodeNumber) =>
  api.delete(`/media/${mediaId}/seasons/${seasonNumber}/episodes/${episodeNumber}`);