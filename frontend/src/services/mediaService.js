import api from "./api";

// ── Read ──────────────────────────────────────────────────────────────────────



export const getAll = (params) =>
  api.get("/media", { params }).then(r => r.data);

export const getMediaById = (id) =>
  api.get(`/media/${id}`).then(r => r.data);

export const getGenres = () =>
  api.get("/media/genres").then(r => r.data);

// ── TMDB proxies ──────────────────────────────────────────────────────────────

export const searchTmdb = (q, type = "movie") =>
  api.get("/media/tmdb/search", { params: { q, type } }).then((r) => r.data);

export const getTmdbDetails = (tmdbId, type = "movie") =>
  api.get(`/media/tmdb/details/${tmdbId}`, { params: { type } }).then((r) => r.data);

/** Fetches full TV series including all seasons + episodes */
export const getTmdbSeriesDetails = (tmdbId) =>
  api.get(`/media/tmdb/series/${tmdbId}`).then((r) => r.data);

// ── Open Library proxies ──────────────────────────────────────────────────────

export const searchBooks = (q) =>
  api.get("/media/books/search", { params: { q } }).then((r) => r.data);

export const getBookDetails = (olId) =>
  api.get("/media/books/details", { params: { olId } }).then((r) => r.data);

// ── Single create ─────────────────────────────────────────────────────────────

export const createMovie = (dto) =>
  api.post("/media/movies", dto).then((r) => r.data);

export const createBook = (dto) =>
  api.post("/media/books", dto).then((r) => r.data);

export const createTvSeries = (dto) =>
  api.post("/media/tvseries", dto).then((r) => r.data);

// ── Bulk create (cart) ────────────────────────────────────────────────────────

/**
 * Submit the entire cart in one call.
 * @param {Array} cartItems  - from MediaCartContext: [{ type, data }, ...]
 * @returns {Promise<{ created: [], errors: [] }>}
 */
export const bulkCreateMedia = (cartItems) => {
  const body = { movies: [], books: [], tvSeries: [] };

  for (const item of cartItems) {
    if (item.type === "Movie") body.movies.push(item.data);
    else if (item.type === "Book") body.books.push(item.data);
    else if (item.type === "TvSeries") body.tvSeries.push(item.data);
  }

  return api.post("/media/bulk", body).then((r) => r.data);
};