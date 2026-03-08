import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import * as mediaService from '../services/mediaService';
import MediaCard from '../components/MediaCard/MediaCard';
import './MediaListPage.css';

const MEDIA_TYPES = ['Movie', 'Book', 'TvSeries'];
const SORT_OPTIONS = [
    { value: 'rating:desc', label: 'Top Rated' },
    { value: 'rating:asc', label: 'Lowest Rated' },
    { value: 'year:desc', label: 'Newest' },
    { value: 'year:asc', label: 'Oldest' },
    { value: 'title:asc', label: 'A – Z' },
    { value: 'title:desc', label: 'Z – A' },
];
const PAGE_SIZE = 24;

const MediaListPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Derive initial state from URL so filters are shareable/bookmarkable
    const initialTypes = searchParams.get('types')?.split(',').filter(Boolean) ?? MEDIA_TYPES;
    const initialGenres = searchParams.get('genres')?.split(',').map(Number).filter(Boolean) ?? [];
    const initialSearch = searchParams.get('search') ?? '';
    const initialSort = searchParams.get('sort') ?? 'rating:desc';
    const initialPage = Number(searchParams.get('page') ?? 1);

    const [selectedTypes, setSelectedTypes] = useState(initialTypes);
    const [selectedGenres, setSelectedGenres] = useState(initialGenres);
    const [search, setSearch] = useState(initialSearch);
    const [searchInput, setSearchInput] = useState(initialSearch);
    const [sort, setSort] = useState(initialSort);
    const [page, setPage] = useState(initialPage);

    const [genres, setGenres] = useState([]);
    const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load genres once
    useEffect(() => {
        mediaService.getGenres()
            .then(r => setGenres(Array.isArray(r.data) ? r.data : []))
            .catch(err => {
                setGenres([]);
                // If unauthorized, redirect to login
                if (err?.response?.status === 401) {
                    navigate('/login');
                }
            });
    }, [navigate]);

    // Sync state → URL
    useEffect(() => {
        const params = {};
        if (selectedTypes.length < 3) params.types = selectedTypes.join(',');
        if (selectedGenres.length > 0) params.genres = selectedGenres.join(',');
        if (search) params.search = search;
        if (sort !== 'rating:desc') params.sort = sort;
        if (page > 1) params.page = page;
        setSearchParams(params, { replace: true });
    }, [selectedTypes, selectedGenres, search, sort, page, setSearchParams]);

    // Fetch media
    const fetchMedia = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [sortBy, sortDir] = sort.split(':');
            const params = {
                types: selectedTypes,
                genreIds: selectedGenres,
                search,
                sortBy,
                sortDir,
                page,
                pageSize: PAGE_SIZE,
            };
            const r = await mediaService.getAll(params);
            if (r && Array.isArray(r.items)) {
                setResult(r);
            } else {
                setError('Media response format invalid.');
            }
        } catch (e) {
            console.error('fetchMedia error:', e);
            setError('Failed to load media.');
        } finally {
            setLoading(false);
        }
    }, [selectedTypes, selectedGenres, search, sort, page]);

    useEffect(() => { fetchMedia(); }, [fetchMedia]);

    const toggleType = (type) => {
        setPage(1);
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.length > 1 ? prev.filter(t => t !== type) : prev // keep at least one
                : [...prev, type]
        );
    };

    const toggleGenre = (id) => {
        setPage(1);
        setSelectedGenres(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        setSearch(searchInput);
    };

    return (
        <div className="media-list-page">
            {/* Toolbar */}
            <div className="media-list-toolbar">
                {/* Search */}
                <form className="media-search-form" onSubmit={handleSearchSubmit}>
                    <input
                        type="text"
                        className="media-search-input"
                        placeholder="Search titles..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                    />
                    <button type="submit" className="media-search-btn">Search</button>
                </form>

                {/* Sort */}
                <select
                    className="media-sort-select"
                    value={sort}
                    onChange={e => { setSort(e.target.value); setPage(1); }}
                >
                    {SORT_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {/* Add button — visible to any logged-in user for now */}
                {user && (
                    <button
                        className="media-add-btn"
                        onClick={() => navigate('/media/add')}
                    >
                        + Add Media
                    </button>
                )}
            </div>

            <div className="media-list-layout">
                {/* Sidebar filters */}
                <aside className="media-filters">
                    <div className="filter-section">
                        <h4 className="filter-heading">Type</h4>
                        {MEDIA_TYPES.map(type => (
                            <label key={type} className="filter-checkbox">
                                <input
                                    type="checkbox"
                                    checked={selectedTypes.includes(type)}
                                    onChange={() => toggleType(type)}
                                />
                                {type === 'TvSeries' ? 'TV Series' : type}
                            </label>
                        ))}
                    </div>

                    {Array.isArray(genres) && genres.length > 0 && (
                        <div className="filter-section">
                            <h4 className="filter-heading">Genre</h4>
                            {genres.map(g => (
                                <label key={g.id} className="filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedGenres.includes(g.id)}
                                        onChange={() => toggleGenre(g.id)}
                                    />
                                    {g.name}
                                </label>
                            ))}
                        </div>
                    )}
                </aside>

                {/* Grid */}
                <main className="media-grid-area">
                    {error && <p className="media-error">{error}</p>}

                    {loading ? (
                        <div className="media-grid-skeleton">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="media-card-skeleton" />
                            ))}
                        </div>
                    ) : result.items.length === 0 ? (
                        <div className="media-empty">
                            <p>No media found. Try adjusting your filters.</p>
                        </div>
                    ) : (
                        <div className="media-grid">
                            {result.items.map(m => (
                                <MediaCard key={m.id} media={m} />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {result.totalPages > 1 && (
                        <div className="media-pagination">
                            <button
                                className="page-btn"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                ← Prev
                            </button>
                            <span className="page-info">
                                Page {page} of {result.totalPages}
                            </span>
                            <button
                                className="page-btn"
                                disabled={page >= result.totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default MediaListPage;
