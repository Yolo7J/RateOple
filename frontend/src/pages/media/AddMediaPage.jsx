import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as mediaService from '../../services/mediaService';
import { useMediaCart } from '../../context/MediaCartContext';
import tmdbService from '../../services/tmdbService';
import './AddMediaPage.css';

const STEPS = { SELECT_TYPE: 0, SEARCH: 1, FILL_FORM: 2 };

const AddMediaPage = () => {
    const navigate = useNavigate();
    const { addItem } = useMediaCart();

    const [step, setStep] = useState(STEPS.SELECT_TYPE);
    const [mediaType, setMediaType] = useState(null);   // 'Movie' | 'Book' | 'TvSeries'
    const [genres, setGenres] = useState([]);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const searchTimeout = useRef(null);

    // Holds the raw TMDB series details (including tmdbId) when a TvSeries is selected
    const [selectedTmdbSeries, setSelectedTmdbSeries] = useState(null);

    // Form state
    const [form, setForm] = useState({
        title: '', description: '', coverUrl: '', releaseYear: '',
        director: '', duration: '',
        author: '', pages: '', isbn: '',
        subjects: '',
        tmdbId: null, olId: null,
        genreIds: [],
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    // After a TvSeries is added to cart, offer navigation to season manager
    // We store the created media id (from cart item) to link to /media/:id/seasons
    // Since cart items don't have a DB id yet, we navigate to cart and let them
    // submit first. But if a series is submitted directly, we can navigate.
    // Here we track if we just added a TvSeries to cart.
    const [justAddedSeries, setJustAddedSeries] = useState(false);

    useEffect(() => {
        mediaService.getGenres().then(setGenres).catch(() => setGenres([]));
    }, []);

    // ── Debounced search ──────────────────────────────────────────────────────
    useEffect(() => {
        if (step !== STEPS.SEARCH || !searchQuery.trim()) {
            setSearchResults([]);
            setSearchError(null);
            return;
        }

        clearTimeout(searchTimeout.current);
        setSearchLoading(true);
        setSearchError(null);

        searchTimeout.current = setTimeout(async () => {
            try {
                if (mediaType === 'Book') {
                    const results = await mediaService.searchBooks(searchQuery);
                    setSearchResults(results.map(r => ({
                        id:       r.olId,
                        title:    r.title,
                        subtitle: r.authorName ?? '',
                        coverUrl: r.coverUrl ?? null,
                        year:     r.firstPublishYear ?? null,
                        _raw:     r,
                    })));
                } else {
                    const type = mediaType === 'TvSeries' ? 'tv' : 'movie';
                    const r = await tmdbService.search(searchQuery, type);
                    setSearchResults((r.data ?? []).map(r => ({
                        id:       r.tmdbId,
                        title:    r.title,
                        subtitle: r.releaseYear ? String(r.releaseYear) : '',
                        coverUrl: r.coverUrl ?? null,
                        year:     r.releaseYear ?? null,
                        _raw:     r,
                    })));
                }
            } catch {
                setSearchError('Search failed. Please try again.');
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 400);

        return () => clearTimeout(searchTimeout.current);
    }, [searchQuery, step, mediaType]);

    const handleSelectType = (type) => {
        setMediaType(type);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedTmdbSeries(null);
        setJustAddedSeries(false);
        setStep(STEPS.SEARCH);
    };

    // ── Result selected — fetch details then go to form ───────────────────────
    const handleSelectResult = async (result) => {
        try {
            if (mediaType === 'Book') {
                const details = await mediaService.getBookDetails(result._raw.olId);
                setForm({
                    title:       details.title        ?? '',
                    description: details.description  ?? '',
                    coverUrl:    details.coverUrl     ?? '',
                    releaseYear: details.firstPublishYear ? String(details.firstPublishYear) : '',
                    author:      details.author       ?? '',
                    pages:       details.pages        ? String(details.pages) : '',
                    isbn:        details.isbn         ?? '',
                    subjects:    (details.subjects ?? []).slice(0, 5).join(', '),
                    director: '', duration: '',
                    tmdbId: null,
                    olId:   details.olId ?? result._raw.olId,
                    genreIds: [],
                });
                setSelectedTmdbSeries(null);
            } else {
                const type = mediaType === 'TvSeries' ? 'tv' : 'movie';
                const r = await tmdbService.getDetails(result._raw.tmdbId, type);
                const details = r.data;

                const matchedGenreIds = genres
                    .filter(g => details.genres?.includes(g.name))
                    .map(g => g.id);

                setForm({
                    title:       details.title       ?? '',
                    description: details.description ?? '',
                    coverUrl:    details.coverUrl    ?? '',
                    releaseYear: details.releaseYear ? String(details.releaseYear) : '',
                    director:    details.director    ?? '',
                    duration:    details.duration    ? String(details.duration) : '',
                    author: '', pages: '', isbn: '', subjects: '',
                    tmdbId: details.tmdbId,
                    olId:   null,
                    genreIds: matchedGenreIds,
                });

                // Store the tmdbId for TvSeries so SeasonManagerPage can use it
                if (mediaType === 'TvSeries') {
                    setSelectedTmdbSeries({ tmdbId: details.tmdbId });
                }
            }
        } catch {
            setForm(prev => ({
                ...prev,
                title:    result.title ?? '',
                coverUrl: result.coverUrl ?? '',
                releaseYear: result.year ? String(result.year) : '',
                ...(mediaType === 'Book'
                    ? { author: result._raw.authorName ?? '', olId: result._raw.olId }
                    : { tmdbId: result._raw.tmdbId }),
            }));
            if (mediaType === 'TvSeries') {
                setSelectedTmdbSeries({ tmdbId: result._raw.tmdbId });
            }
        }
        setStep(STEPS.FILL_FORM);
    };

    const handleSkipSearch = () => {
        setForm({
            title: '', description: '', coverUrl: '', releaseYear: '',
            director: '', duration: '',
            author: '', pages: '', isbn: '', subjects: '',
            tmdbId: null, olId: null,
            genreIds: [],
        });
        setSelectedTmdbSeries(null);
        setStep(STEPS.FILL_FORM);
    };

    const toggleGenre = (id) => {
        setForm(prev => ({
            ...prev,
            genreIds: prev.genreIds.includes(id)
                ? prev.genreIds.filter(g => g !== id)
                : [...prev.genreIds, id],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaveError(null);
        try {
            addItem(mediaType, {
                ...form,
                releaseYear: form.releaseYear ? parseInt(form.releaseYear) : null,
                duration:    form.duration    ? parseInt(form.duration)    : null,
                pages:       form.pages       ? parseInt(form.pages)       : null,
            });

            if (mediaType === 'TvSeries') {
                setJustAddedSeries(true);
            } else {
                navigate('/cart');
            }
        } catch {
            setSaveError('Failed to add to cart.');
        } finally {
            setSaving(false);
        }
    };

    // ── Step 0: Select type ───────────────────────────────────────────────────
    if (step === STEPS.SELECT_TYPE) {
        return (
            <div className="add-media-page">
                <h1 className="add-media-heading">Add Media</h1>
                <p className="add-media-sub">What type of media are you adding?</p>
                <div className="type-select-grid">
                    {[
                        { type: 'Movie',    icon: '🎬', label: 'Movie'     },
                        { type: 'Book',     icon: '📚', label: 'Book'      },
                        { type: 'TvSeries', icon: '📺', label: 'TV Series' },
                    ].map(({ type, icon, label }) => (
                        <button
                            key={type}
                            className="type-select-card"
                            onClick={() => handleSelectType(type)}
                        >
                            <span className="type-icon">{icon}</span>
                            <span className="type-label">{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // ── Step 1: Search ────────────────────────────────────────────────────────
    if (step === STEPS.SEARCH) {
        const isBook = mediaType === 'Book';
        const placeholder = isBook
            ? 'Search by title, author, ISBN…'
            : mediaType === 'TvSeries' ? 'Search TV series…' : 'Search movies…';

        return (
            <div className="add-media-page">
                <button className="add-back-btn" onClick={() => setStep(STEPS.SELECT_TYPE)}>← Back</button>
                <h1 className="add-media-heading">
                    {isBook ? 'Search Open Library' : 'Search TMDB'}
                </h1>
                <p className="add-media-sub">
                    Find the title to auto-fill details, or skip to fill manually.
                </p>

                <input
                    className="tmdb-search-input"
                    type="text"
                    placeholder={placeholder}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    autoFocus
                />

                {searchLoading && <p className="tmdb-status">Searching…</p>}
                {searchError  && <p className="tmdb-status tmdb-error">{searchError}</p>}

                <div className="tmdb-results">
                    {searchResults.map(r => (
                        <button
                            key={r.id}
                            className="tmdb-result-card"
                            onClick={() => handleSelectResult(r)}
                        >
                            {r.coverUrl
                                ? <img src={r.coverUrl} alt={r.title} />
                                : <div className="tmdb-no-cover">?</div>
                            }
                            <div className="tmdb-result-info">
                                <span className="tmdb-result-title">{r.title}</span>
                                {r.subtitle && <span className="tmdb-result-year">{r.subtitle}</span>}
                            </div>
                        </button>
                    ))}
                </div>

                <button className="add-skip-btn" onClick={handleSkipSearch}>
                    Skip and fill manually →
                </button>
            </div>
        );
    }

    // ── Post-add TvSeries prompt ───────────────────────────────────────────────
    if (justAddedSeries) {
        return (
            <div className="add-media-page">
                <div className="tv-added-banner">
                    <span className="tv-added-icon">📺</span>
                    <h2 className="tv-added-title">"{form.title}" added to cart</h2>
                    <p className="tv-added-sub">
                        The series is in your cart. You can submit it now, or first
                        go to your cart and confirm the submission — then manage its
                        seasons and episodes from the media detail page.
                    </p>
                    <div className="tv-added-actions">
                        <button
                            className="tv-added-btn tv-added-btn--primary"
                            onClick={() => navigate('/cart')}
                        >
                            Go to Cart & Submit →
                        </button>
                        <button
                            className="tv-added-btn tv-added-btn--ghost"
                            onClick={() => {
                                setStep(STEPS.SELECT_TYPE);
                                setJustAddedSeries(false);
                                setMediaType(null);
                            }}
                        >
                            Add another title
                        </button>
                    </div>
                    <p className="tv-added-note">
                        💡 After submitting, open the series page and click
                        <strong> "Manage Seasons"</strong> to import or edit seasons and episodes.
                        {selectedTmdbSeries && " TMDB data will auto-load."}
                    </p>
                </div>
            </div>
        );
    }

    // ── Step 2: Fill form ─────────────────────────────────────────────────────
    const f   = (field) => form[field];
    const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    return (
        <div className="add-media-page">
            <button className="add-back-btn" onClick={() => setStep(STEPS.SEARCH)}>← Back</button>
            <h1 className="add-media-heading">
                {mediaType === 'TvSeries' ? 'Add TV Series' : `Add ${mediaType}`}
            </h1>

            {mediaType === 'TvSeries' && (
                <div className="tv-series-notice">
                    📺 After adding to cart and submitting, you'll be able to manage
                    seasons &amp; episodes from the series page.
                    {selectedTmdbSeries && ' TMDB seasons will auto-load.'}
                </div>
            )}

            <form className="add-media-form" onSubmit={handleSubmit}>
                <div className="form-row">
                    {f('coverUrl') && (
                        <div className="cover-preview">
                            <img
                                src={f('coverUrl')}
                                alt="Cover preview"
                                onError={e => { e.target.style.display = 'none'; }}
                            />
                        </div>
                    )}
                    <div className="form-fields">
                        <label className="form-label">
                            Title *
                            <input className="form-input" required value={f('title')} onChange={set('title')} />
                        </label>
                        <label className="form-label">
                            Cover Image URL
                            <input className="form-input" value={f('coverUrl')} onChange={set('coverUrl')} placeholder="https://…" />
                        </label>
                        <div className="form-row-2">
                            <label className="form-label">
                                Release Year
                                <input className="form-input" type="number" min="1800" max="2100"
                                    value={f('releaseYear')} onChange={set('releaseYear')} />
                            </label>
                            {mediaType === 'Movie' && (
                                <label className="form-label">
                                    Duration (min)
                                    <input className="form-input" type="number" min="1"
                                        value={f('duration')} onChange={set('duration')} />
                                </label>
                            )}
                            {mediaType === 'Book' && (
                                <label className="form-label">
                                    Pages
                                    <input className="form-input" type="number" min="1"
                                        value={f('pages')} onChange={set('pages')} />
                                </label>
                            )}
                        </div>

                        {mediaType === 'Movie' && (
                            <label className="form-label">
                                Director
                                <input className="form-input" value={f('director')} onChange={set('director')} />
                            </label>
                        )}
                        {mediaType === 'Book' && (
                            <>
                                <label className="form-label">
                                    Author
                                    <input className="form-input" value={f('author')} onChange={set('author')} />
                                </label>
                                <label className="form-label">
                                    ISBN
                                    <input className="form-input" value={f('isbn')} onChange={set('isbn')} />
                                </label>
                                {f('subjects') && (
                                    <label className="form-label">
                                        Subjects
                                        <input className="form-input" value={f('subjects')} onChange={set('subjects')}
                                            placeholder="From Open Library" />
                                    </label>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <label className="form-label">
                    Description
                    <textarea className="form-textarea" rows={4}
                        value={f('description')} onChange={set('description')} />
                </label>

                {Array.isArray(genres) && genres.length > 0 && (
                    <div className="form-label">
                        Genres
                        <div className="genre-picker">
                            {genres.map(g => (
                                <label key={g.id} className="genre-pick-item">
                                    <input
                                        type="checkbox"
                                        checked={form.genreIds.includes(g.id)}
                                        onChange={() => toggleGenre(g.id)}
                                    />
                                    {g.name}
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {saveError && <p className="save-error">{saveError}</p>}

                <div className="form-actions">
                    <button type="submit" className="save-btn" disabled={saving}>
                        {saving ? 'Saving…' : 'Add to Cart'}
                    </button>
                    <button type="button" className="cancel-btn" onClick={() => navigate('/media')}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddMediaPage;
