import api from './api';

// All calls go through our backend proxy — the TMDB key never touches the browser
const tmdbService = {
    // type: "movie" | "tv"
    search: (query, type) => api.get('/tmdb/search', { params: { query, type } }),
    getDetails: (tmdbId, type) => api.get('/tmdb/details', { params: { tmdbId, type } }),
};

export default tmdbService;