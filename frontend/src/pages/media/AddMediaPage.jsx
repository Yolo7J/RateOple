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

    // TMDB search state
    const [tmdbQuery, setTmdbQuery] = useState('');
    const [tmdbResults, setTmdbResults] = useState([]);
    const [tmdbLoading, setTmdbLoading] = useState(false);
    const [tmdbError, setTmdbError] = useState(null);
    const searchTimeout = useRef(null);

    // Form state — pre-populated from TMDB or filled manually
    const [form, setForm] = useState({
        title: '', description: '', coverUrl: '', releaseYear: '',
        director: '', duration: '',   // movie
        author: '', pages: '', isbn: '', // book
        tmdbId: null, olId: null,
        genreIds: [],
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    useEffect(() => {
        mediaService.getGenres().then(setGenres).catch(() => setGenres([]));
    }, []);

    // Debounced TMDB search
    useEffect(() => {
        if (step !== STEPS.SEARCH || !tmdbQuery.trim() || mediaType === 'Book') return;
        clearTimeout(searchTimeout.current);
        setTmdbLoading(true);
        setTmdbError(null);
        searchTimeout.current = setTimeout(async () => {
            try {
                const type = mediaType === 'TvSeries' ? 'tv' : 'movie';
                const r = await tmdbService.search(tmdbQuery, type);
                setTmdbResults(r.data);
            } catch {
                setTmdbError('TMDB search failed.');
            } finally {
                setTmdbLoading(false);
            }
        }, 400);
        return () => clearTimeout(searchTimeout.current);
    }, [tmdbQuery, step, mediaType]);

    const handleSelectType = (type) => {
        setMediaType(type);
        setStep(STEPS.SEARCH);
    };

    const handleSelectTmdb = async (result) => {
        // Fetch full details to get director, duration, genres etc.
        try {
            const type = mediaType === 'TvSeries' ? 'tv' : 'movie';
            const r = await tmdbService.getDetails(result.tmdbId, type);
            const details = r.data;

            // Map TMDB genre names to our genre IDs
            const matchedGenreIds = genres
                .filter(g => details.genres?.includes(g.name))
                .map(g => g.id);

            setForm({
                title: details.title ?? '',
                description: details.description ?? '',
                coverUrl: details.coverUrl ?? '',
                releaseYear: details.releaseYear?.toString() ?? '',
                director: details.director ?? '',
                duration: details.duration?.toString() ?? '',
                author: '', pages: '', isbn: '',
                tmdbId: details.tmdbId,
                olId: null,
                genreIds: matchedGenreIds,
            });
        } catch {
            // Fallback to search result data if details call fails
            setForm(prev => ({
                ...prev,
                title: result.title ?? '',
                description: result.description ?? '',
                coverUrl: result.coverUrl ?? '',
                releaseYear: result.releaseYear?.toString() ?? '',
                tmdbId: result.tmdbId,
            }));
        }
        setStep(STEPS.FILL_FORM);
    };

    const handleSkipSearch = () => {
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
                duration: form.duration ? parseInt(form.duration) : null,
                pages: form.pages ? parseInt(form.pages) : null,
            });
            navigate('/cart');
        } catch (err) {
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
                        { type: 'Movie', icon: '🎬', label: 'Movie' },
                        { type: 'Book', icon: '📚', label: 'Book' },
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

    // ── Step 1: Search TMDB / skip ────────────────────────────────────────────
    if (step === STEPS.SEARCH) {
        const isBook = mediaType === 'Book';
        return (
            <div className="add-media-page">
                <button className="add-back-btn" onClick={() => setStep(STEPS.SELECT_TYPE)}>← Back</button>
                <h1 className="add-media-heading">
                    {isBook ? 'Search Open Library' : 'Search TMDB'}
                </h1>
                <p className="add-media-sub">
                    {isBook
                        ? 'Open Library search coming soon — fill in details manually for now.'
                        : 'Find the title to auto-fill details, or skip to fill manually.'}
                </p>

                {!isBook && (
                    <>
                        <input
                            className="tmdb-search-input"
                            type="text"
                            placeholder={`Search ${mediaType === 'TvSeries' ? 'TV series' : 'movies'}…`}
                            value={tmdbQuery}
                            onChange={e => setTmdbQuery(e.target.value)}
                            autoFocus
                        />
                        {tmdbLoading && <p className="tmdb-status">Searching…</p>}
                        {tmdbError && <p className="tmdb-status tmdb-error">{tmdbError}</p>}

                        <div className="tmdb-results">
                            {tmdbResults.map(r => (
                                <button
                                    key={r.tmdbId}
                                    className="tmdb-result-card"
                                    onClick={() => handleSelectTmdb(r)}
                                >
                                    {r.coverUrl
                                        ? <img src={r.coverUrl} alt={r.title} />
                                        : <div className="tmdb-no-cover">?</div>
                                    }
                                    <div className="tmdb-result-info">
                                        <span className="tmdb-result-title">{r.title}</span>
                                        {r.releaseYear && (
                                            <span className="tmdb-result-year">{r.releaseYear}</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                <button className="add-skip-btn" onClick={handleSkipSearch}>
                    {isBook ? 'Fill in manually →' : 'Skip and fill manually →'}
                </button>
            </div>
        );
    }

    // ── Step 2: Fill form ─────────────────────────────────────────────────────
    const f = (field) => form[field];
    const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    return (
        <div className="add-media-page">
            <button className="add-back-btn" onClick={() => setStep(STEPS.SEARCH)}>← Back</button>
            <h1 className="add-media-heading">
                {mediaType === 'TvSeries' ? 'Add TV Series' : `Add ${mediaType}`}
            </h1>

            <form className="add-media-form" onSubmit={handleSubmit}>
                <div className="form-row">
                    {/* Cover preview */}
                    {f('coverUrl') && (
                        <div className="cover-preview">
                            <img src={f('coverUrl')} alt="Cover preview"
                                onError={e => { e.target.style.display = 'none'; }} />
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
                            </>
                        )}
                    </div>
                </div>

                <label className="form-label">
                    Description
                    <textarea className="form-textarea" rows={4}
                        value={f('description')} onChange={set('description')} />
                </label>

                {/* Genres */}
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
                        {saving ? 'Saving…' : 'Save'}
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
