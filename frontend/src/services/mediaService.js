import api from './api';

const mediaService = {
    // GET /api/media — pass a params object matching MediaQueryDto
    getAll: (params = {}) => api.get('/media', { params }),

    // GET /api/media/:id
    getById: (id) => api.get(`/media/${id}`),

    // GET /api/media/genres
    getGenres: () => api.get('/media/genres'),

    // POST /api/media/movies
    createMovie: (dto) => api.post('/media/movies', dto),

    // POST /api/media/books
    createBook: (dto) => api.post('/media/books', dto),

    // POST /api/media/tvseries
    createTvSeries: (dto) => api.post('/media/tvseries', dto),
};

export default mediaService;