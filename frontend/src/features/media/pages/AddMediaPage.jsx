import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useMediaCart } from '../../../context/MediaCartContext';
import { useMediaCommands } from '../queries/useMediaCommands';

const STEPS = { SELECT_TYPE: 0, SEARCH: 1, FILL_FORM: 2 };
const emptyEpisode = (episodeNumber) => ({ episodeNumber, title: '', duration: '' });
const emptySeason = (seasonNumber) => ({ seasonNumber, episodes: [emptyEpisode(1)] });
const mapTmdbSeasonsToForm = (seasons) =>
    (seasons ?? []).map((season, seasonIndex) => ({
        seasonNumber: Number(season.seasonNumber) || seasonIndex + 1,
        episodes: (season.episodes ?? []).map((episode, episodeIndex) => ({
            episodeNumber: Number(episode.episodeNumber) || episodeIndex + 1,
            title: episode.title ?? '',
            duration: episode.duration != null ? String(episode.duration) : '',
        })),
    }));

const styles = {
    page: [
        'mx-auto w-[min(1160px,calc(100vw-32px))] max-sm:w-[min(1160px,calc(100vw-22px))]',
        'py-7 pb-14 flex flex-col gap-4',
    ].join(' '),
    backBtn: [
        'self-start rounded-xl border border-[var(--border)] bg-[var(--btn-bg)] px-4 py-2 text-sm',
        'text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)]',
    ].join(' '),
    heading: 'text-[clamp(1.6rem,2vw,2rem)] font-extrabold tracking-tight text-[var(--text-primary)]',
    sub: 'text-[var(--text-muted)]',
    seriesNotice: [
        'rounded-xl border border-[var(--accent)] bg-[var(--primary-color-alpha)] p-3 text-sm',
        'text-[var(--text-primary)]',
    ].join(' '),
    addedBanner: [
        'mx-auto w-full max-w-[680px] rounded-2xl border border-[var(--border)]',
        'bg-[var(--card-bg)] p-8 text-center',
    ].join(' '),
    addedIcon: 'mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/20 text-2xl',
    addedTitle: 'text-xl font-semibold text-[var(--text-primary)]',
    addedSub: 'mx-auto mt-3 max-w-[56ch] text-sm text-[var(--text-muted)]',
    addedActions: 'mb-4 mt-5 flex flex-wrap justify-center gap-3',
    addedBtn: 'rounded-xl px-4 py-2 text-sm font-semibold',
    addedPrimary: 'bg-[var(--accent)] text-[#121212] transition hover:bg-[var(--accent-strong)]',
    addedGhost: [
        'border border-[var(--border)] bg-[var(--btn-bg)] text-[var(--text-primary)]',
        'transition hover:bg-[var(--btn-hover)]',
    ].join(' '),
    addedNote: [
        'mx-auto max-w-[60ch] rounded-xl border border-dashed border-[var(--border)]',
        'p-3 text-xs text-[var(--text-muted)]',
    ].join(' '),
    typeSelectGrid: 'mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
    typeSelectCard: [
        'flex min-h-[148px] flex-col items-center justify-center gap-3 rounded-2xl',
        'border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] transition',
        'hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/10',
    ].join(' '),
    typeIcon: 'text-3xl',
    typeLabel: 'font-bold',
    searchInput: [
        'w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-base',
        'text-[var(--text-primary)]',
    ].join(' '),
    searchStatus: 'text-sm text-[var(--text-muted)]',
    searchError: 'text-[#ff6d75]',
    results: 'flex flex-col gap-2',
    resultCard: [
        'flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)]',
        'px-3 py-2 text-left text-[var(--text-primary)] transition hover:border-[var(--accent)]/50',
    ].join(' '),
    resultImage: 'h-[76px] w-[52px] flex-shrink-0 rounded-lg object-cover',
    noCover: 'flex h-[76px] w-[52px] items-center justify-center rounded-lg bg-[var(--card-cover-bg)] text-[var(--text-muted)]',
    resultInfo: 'flex flex-col gap-1',
    resultTitle: 'text-sm font-semibold',
    resultYear: 'text-xs text-[var(--text-muted)]',
    skipBtn: [
        'self-start rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-sm',
        'text-[var(--text-muted)] transition hover:text-[var(--text-primary)] hover:border-[var(--accent)]',
    ].join(' '),
    form: 'flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5',
    formRow: 'grid grid-cols-1 gap-4 md:grid-cols-[minmax(130px,180px)_minmax(0,1fr)] items-start',
    cover: [
        'w-full max-w-[180px] aspect-[2/3] overflow-hidden rounded-xl border border-[var(--border)]',
        'bg-[var(--card-cover-bg)]',
    ].join(' '),
    coverImage: 'h-full w-full object-cover',
    formFields: 'flex flex-col gap-4',
    formRow2: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
    formLabel: 'flex flex-col gap-1 text-xs font-semibold text-[var(--text-secondary)]',
    formInput: [
        'w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm',
        'text-[var(--text-primary)] outline-none focus:border-[var(--accent)]',
    ].join(' '),
    formTextarea: 'min-h-[92px] resize-y',
    genrePicker: 'flex flex-wrap gap-2',
    genreItem: [
        'inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1 text-xs',
        'text-[var(--text-muted)] transition cursor-pointer',
    ].join(' '),
    genreItemActive: 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]',
    genreInput: 'sr-only',
    saveError: 'text-sm text-[#ff6d75]',
    seasonBuilder: [
        'flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4',
    ].join(' '),
    seasonHeader: 'flex items-center justify-between gap-3',
    seasonAdd: [
        'rounded-lg border border-[var(--border)] bg-[var(--btn-bg)] px-3 py-1.5 text-xs',
        'text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)]',
    ].join(' '),
    seasonEmpty: 'text-xs text-[var(--text-muted)]',
    seasonBlock: 'flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3',
    seasonBlockHeader: 'flex items-center justify-between gap-2 text-sm font-bold',
    seasonRemove: [
        'rounded-lg border border-[var(--border)] bg-[var(--btn-bg)] px-3 py-1.5 text-xs',
        'text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)] disabled:opacity-50',
    ].join(' '),
    episodeList: 'flex flex-col gap-2',
    episodeRow: 'grid grid-cols-[auto_1fr] gap-2 items-center sm:grid-cols-[auto_1fr_90px_auto]',
    episodeNum: 'min-w-[24px] text-xs font-bold text-[var(--text-muted)]',
    episodeDuration: 'sm:w-[90px]',
    episodeAdd: [
        'rounded-lg border border-[var(--border)] bg-[var(--btn-bg)] px-3 py-1.5 text-xs',
        'text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)]',
    ].join(' '),
    formActions: 'flex flex-wrap gap-3',
    saveBtn: [
        'rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#151515]',
        'transition hover:bg-[var(--accent-strong)] disabled:opacity-60 disabled:cursor-not-allowed',
    ].join(' '),
    cancelBtn: [
        'rounded-xl border border-[var(--border)] bg-[var(--btn-bg)] px-4 py-2 text-sm font-semibold',
        'text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)]',
    ].join(' '),
};

const AddMediaPage = () => {
    const navigate = useNavigate();
    const { addItem } = useMediaCart();
    const {
        getGenres,
        searchBooks,
        getBookDetails,
        getTmdbSeriesDetails,
        searchTmdb,
        getTmdbDetails,
    } = useMediaCommands();

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
        seasons: [],
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
        getGenres().then(setGenres).catch(() => setGenres([]));
    }, [getGenres]);

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
                    const results = await searchBooks(searchQuery);
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
                    const r = await searchTmdb(searchQuery, type);
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
    }, [searchQuery, step, mediaType, searchBooks, searchTmdb]);

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
                const details = await getBookDetails(result._raw.olId);
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
                    seasons: [],
                });
                setSelectedTmdbSeries(null);
            } else {
                const type = mediaType === 'TvSeries' ? 'tv' : 'movie';
                const r = await getTmdbDetails(result._raw.tmdbId, type);
                const details = r.data;
                let seriesSeasons = [];

                if (mediaType === 'TvSeries') {
                    try {
                        const tmdbSeries = await getTmdbSeriesDetails(details.tmdbId);
                        seriesSeasons = mapTmdbSeasonsToForm(tmdbSeries.seasons);
                    } catch {
                        seriesSeasons = [];
                    }
                }

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
                    seasons: mediaType === 'TvSeries'
                        ? (seriesSeasons.length > 0 ? seriesSeasons : [emptySeason(1)])
                        : [],
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
                ...(mediaType === 'TvSeries' ? { seasons: [emptySeason(1)] } : {}),
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
            seasons: mediaType === 'TvSeries' ? [emptySeason(1)] : [],
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

    const addSeasonToSeries = () => {
        setForm(prev => ({
            ...prev,
            seasons: [...(prev.seasons ?? []), emptySeason((prev.seasons?.length ?? 0) + 1)],
        }));
    };

    const removeSeasonFromSeries = (seasonIdx) => {
        setForm(prev => ({
            ...prev,
            seasons: (prev.seasons ?? [])
                .filter((_, idx) => idx !== seasonIdx)
                .map((season, idx) => ({ ...season, seasonNumber: idx + 1 })),
        }));
    };

    const addEpisodeToSeason = (seasonIdx) => {
        setForm(prev => ({
            ...prev,
            seasons: (prev.seasons ?? []).map((season, idx) => {
                if (idx !== seasonIdx) return season;
                const nextEpisodeNumber = (season.episodes?.length ?? 0) + 1;
                return {
                    ...season,
                    episodes: [...(season.episodes ?? []), emptyEpisode(nextEpisodeNumber)],
                };
            }),
        }));
    };

    const removeEpisodeFromSeason = (seasonIdx, episodeIdx) => {
        setForm(prev => ({
            ...prev,
            seasons: (prev.seasons ?? []).map((season, idx) => {
                if (idx !== seasonIdx) return season;
                const nextEpisodes = (season.episodes ?? [])
                    .filter((_, epIdx) => epIdx !== episodeIdx)
                    .map((episode, epIdx) => ({ ...episode, episodeNumber: epIdx + 1 }));
                return { ...season, episodes: nextEpisodes };
            }),
        }));
    };

    const setSeasonEpisodeField = (seasonIdx, episodeIdx, field, value) => {
        setForm(prev => ({
            ...prev,
            seasons: (prev.seasons ?? []).map((season, idx) => {
                if (idx !== seasonIdx) return season;
                return {
                    ...season,
                    episodes: (season.episodes ?? []).map((episode, epIdx) =>
                        epIdx === episodeIdx ? { ...episode, [field]: value } : episode
                    ),
                };
            }),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaveError(null);
        try {
            const mappedSeasons = mediaType === 'TvSeries'
                ? (form.seasons ?? []).map((season, seasonIndex) => ({
                    seasonNumber: seasonIndex + 1,
                    episodes: (season.episodes ?? []).map((episode, episodeIndex) => ({
                        episodeNumber: episodeIndex + 1,
                        title: episode.title?.trim() || `Episode ${episodeIndex + 1}`,
                        duration: episode.duration ? parseInt(episode.duration) : null,
                    })),
                }))
                : [];

            addItem(mediaType, {
                ...form,
                releaseYear: form.releaseYear ? parseInt(form.releaseYear) : null,
                duration:    form.duration    ? parseInt(form.duration)    : null,
                pages:       form.pages       ? parseInt(form.pages)       : null,
                seasons: mappedSeasons,
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
            <PageLayout>
                <Container size="full">
                    <div className={styles.page}>
                        <h1 className={styles.heading}>Add Media</h1>
                        <p className={styles.sub}>What type of media are you adding?</p>
                        <div className={styles.typeSelectGrid}>
                            {[
                                { type: 'Movie',    icon: '🎬', label: 'Movie'     },
                                { type: 'Book',     icon: '📚', label: 'Book'      },
                                { type: 'TvSeries', icon: '📺', label: 'TV Series' },
                            ].map(({ type, icon, label }) => (
                                <button
                                    key={type}
                                    className={styles.typeSelectCard}
                                    onClick={() => handleSelectType(type)}
                                >
                                    <span className={styles.typeIcon}>{icon}</span>
                                    <span className={styles.typeLabel}>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </Container>
            </PageLayout>
        );
    }

    // ── Step 1: Search ────────────────────────────────────────────────────────
    if (step === STEPS.SEARCH) {
        const isBook = mediaType === 'Book';
        const placeholder = isBook
            ? 'Search by title, author, ISBN…'
            : mediaType === 'TvSeries' ? 'Search TV series…' : 'Search movies…';

        return (
            <PageLayout>
                <Container size="full">
                    <div className={styles.page}>
                        <button className={styles.backBtn} onClick={() => setStep(STEPS.SELECT_TYPE)}>← Back</button>
                        <h1 className={styles.heading}>
                            {isBook ? 'Search Open Library' : 'Search TMDB'}
                        </h1>
                        <p className={styles.sub}>
                            Find the title to auto-fill details, or skip to fill manually.
                        </p>

                        <input
                            className={styles.searchInput}
                            type="text"
                            placeholder={placeholder}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            autoFocus
                        />

                        {searchLoading && <p className={styles.searchStatus}>Searching…</p>}
                        {searchError && <p className={`${styles.searchStatus} ${styles.searchError}`}>{searchError}</p>}

                        <div className={styles.results}>
                            {searchResults.map(r => (
                                <button
                                    key={r.id}
                                    className={styles.resultCard}
                                    onClick={() => handleSelectResult(r)}
                                >
                                    {r.coverUrl
                                        ? <img src={r.coverUrl} alt={r.title} className={styles.resultImage} />
                                        : <div className={styles.noCover}>?</div>
                                    }
                                    <div className={styles.resultInfo}>
                                        <span className={styles.resultTitle}>{r.title}</span>
                                        {r.subtitle && <span className={styles.resultYear}>{r.subtitle}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <button className={styles.skipBtn} onClick={handleSkipSearch}>
                            Skip and fill manually →
                        </button>
                    </div>
                </Container>
            </PageLayout>
        );
    }

    // ── Post-add TvSeries prompt ───────────────────────────────────────────────
    if (justAddedSeries) {
        return (
            <PageLayout>
                <Container size="full">
                    <div className={styles.page}>
                        <div className={styles.addedBanner}>
                            <span className={styles.addedIcon}>📺</span>
                            <h2 className={styles.addedTitle}>"{form.title}" added to cart</h2>
                            <p className={styles.addedSub}>
                                The series is in your cart. You can submit it now, or first
                                go to your cart and confirm the submission — then manage its
                                seasons and episodes from the media detail page.
                            </p>
                            <div className={styles.addedActions}>
                                <button
                                    className={`${styles.addedBtn} ${styles.addedPrimary}`}
                                    onClick={() => navigate('/cart')}
                                >
                                    Go to Cart & Submit →
                                </button>
                                <button
                                    className={`${styles.addedBtn} ${styles.addedGhost}`}
                                    onClick={() => {
                                        setStep(STEPS.SELECT_TYPE);
                                        setJustAddedSeries(false);
                                        setMediaType(null);
                                    }}
                                >
                                    Add another title
                                </button>
                            </div>
                            <p className={styles.addedNote}>
                                💡 After submitting, open the series page and click
                                <strong> "Manage Seasons"</strong> to import or edit seasons and episodes.
                                {selectedTmdbSeries && " TMDB data will auto-load."}
                            </p>
                        </div>
                    </div>
                </Container>
            </PageLayout>
        );
    }

    // ── Step 2: Fill form ─────────────────────────────────────────────────────
    const f   = (field) => form[field];
    const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    return (
        <PageLayout>
            <Container size="full">
                <div className={styles.page}>
                    <button className={styles.backBtn} onClick={() => setStep(STEPS.SEARCH)}>← Back</button>
                    <h1 className={styles.heading}>
                        {mediaType === 'TvSeries' ? 'Add TV Series' : `Add ${mediaType}`}
                    </h1>

                    {mediaType === 'TvSeries' && (
                        <div className={styles.seriesNotice}>
                            📺 After adding to cart and submitting, you'll be able to manage
                            seasons &amp; episodes from the series page.
                            {selectedTmdbSeries && ' TMDB seasons will auto-load.'}
                        </div>
                    )}

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.formRow}>
                            {f('coverUrl') && (
                                <div className={styles.cover}>
                                    <img
                                        className={styles.coverImage}
                                        src={f('coverUrl')}
                                        alt="Cover preview"
                                        onError={e => { e.target.style.display = 'none'; }}
                                    />
                                </div>
                            )}
                            <div className={styles.formFields}>
                                <label className={styles.formLabel}>
                                    Title *
                                    <input className={styles.formInput} required value={f('title')} onChange={set('title')} />
                                </label>
                                <label className={styles.formLabel}>
                                    Cover Image URL
                                    <input className={styles.formInput} value={f('coverUrl')} onChange={set('coverUrl')} placeholder="https://…" />
                                </label>
                                <div className={styles.formRow2}>
                                    <label className={styles.formLabel}>
                                        Release Year
                                        <input className={styles.formInput} type="number" min="1800" max="2100"
                                            value={f('releaseYear')} onChange={set('releaseYear')} />
                                    </label>
                                    {mediaType === 'Movie' && (
                                        <label className={styles.formLabel}>
                                            Duration (min)
                                            <input className={styles.formInput} type="number" min="1"
                                                value={f('duration')} onChange={set('duration')} />
                                        </label>
                                    )}
                                    {mediaType === 'Book' && (
                                        <label className={styles.formLabel}>
                                            Pages
                                            <input className={styles.formInput} type="number" min="1"
                                                value={f('pages')} onChange={set('pages')} />
                                        </label>
                                    )}
                                </div>

                                {mediaType === 'Movie' && (
                                    <label className={styles.formLabel}>
                                        Director
                                        <input className={styles.formInput} value={f('director')} onChange={set('director')} />
                                    </label>
                                )}
                                {mediaType === 'Book' && (
                                    <>
                                        <label className={styles.formLabel}>
                                            Author
                                            <input className={styles.formInput} value={f('author')} onChange={set('author')} />
                                        </label>
                                        <label className={styles.formLabel}>
                                            ISBN
                                            <input className={styles.formInput} value={f('isbn')} onChange={set('isbn')} />
                                        </label>
                                        {f('subjects') && (
                                            <label className={styles.formLabel}>
                                                Subjects
                                                <input className={styles.formInput} value={f('subjects')} onChange={set('subjects')}
                                                    placeholder="From Open Library" />
                                            </label>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <label className={styles.formLabel}>
                            Description
                            <textarea className={`${styles.formInput} ${styles.formTextarea}`} rows={4}
                                value={f('description')} onChange={set('description')} />
                        </label>

                        {Array.isArray(genres) && genres.length > 0 && (
                            <div className={styles.formLabel}>
                                Genres
                                <div className={styles.genrePicker}>
                                    {genres.map(g => (
                                        <label
                                            key={g.id}
                                            className={clsx(styles.genreItem, form.genreIds.includes(g.id) && styles.genreItemActive)}
                                        >
                                            <input
                                                type="checkbox"
                                                className={styles.genreInput}
                                                checked={form.genreIds.includes(g.id)}
                                                onChange={() => toggleGenre(g.id)}
                                            />
                                            {g.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {mediaType === 'TvSeries' && (
                            <div className={styles.seasonBuilder}>
                                <div className={styles.seasonHeader}>
                                    <h3>Seasons & Episodes</h3>
                                    <button
                                        type="button"
                                        className={styles.seasonAdd}
                                        onClick={addSeasonToSeries}
                                    >
                                        + Add Season
                                    </button>
                                </div>

                                {(form.seasons ?? []).length === 0 && (
                                    <p className={styles.seasonEmpty}>
                                        No seasons yet. Add a season with episodes.
                                    </p>
                                )}

                                {(form.seasons ?? []).map((season, seasonIdx) => (
                                    <div key={seasonIdx} className={styles.seasonBlock}>
                                        <div className={styles.seasonBlockHeader}>
                                            <span>Season {seasonIdx + 1}</span>
                                            <button
                                                type="button"
                                                className={styles.seasonRemove}
                                                onClick={() => removeSeasonFromSeries(seasonIdx)}
                                            >
                                                Remove season
                                            </button>
                                        </div>

                                        <div className={styles.episodeList}>
                                            {(season.episodes ?? []).map((episode, episodeIdx) => (
                                                <div key={episodeIdx} className={styles.episodeRow}>
                                                    <span className={styles.episodeNum}>E{episodeIdx + 1}</span>
                                                    <input
                                                        className={styles.formInput}
                                                        placeholder="Episode title"
                                                        value={episode.title}
                                                        onChange={(e) =>
                                                            setSeasonEpisodeField(seasonIdx, episodeIdx, 'title', e.target.value)
                                                        }
                                                    />
                                                    <input
                                                        className={`${styles.formInput} ${styles.episodeDuration}`}
                                                        type="number"
                                                        min="1"
                                                        placeholder="min"
                                                        value={episode.duration}
                                                        onChange={(e) =>
                                                            setSeasonEpisodeField(seasonIdx, episodeIdx, 'duration', e.target.value)
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        className={styles.seasonRemove}
                                                        onClick={() => removeEpisodeFromSeason(seasonIdx, episodeIdx)}
                                                        disabled={(season.episodes?.length ?? 0) === 1}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            className={styles.episodeAdd}
                                            onClick={() => addEpisodeToSeason(seasonIdx)}
                                        >
                                            + Add Episode
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {saveError && <p className={styles.saveError}>{saveError}</p>}

                        <div className={styles.formActions}>
                            <button type="submit" className={styles.saveBtn} disabled={saving}>
                                {saving ? 'Saving…' : 'Add to Cart'}
                            </button>
                            <button type="button" className={styles.cancelBtn} onClick={() => navigate('/media')}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </Container>
        </PageLayout>
    );
};

export default AddMediaPage;
