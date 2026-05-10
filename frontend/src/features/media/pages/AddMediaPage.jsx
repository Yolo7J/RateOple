import { createElement, useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Film, Image as ImageIcon, Plus, Search, ShoppingCart, Tv, X } from 'lucide-react';
import { useMediaCart } from '../../../context/MediaCartContext';
import { useMediaCommands } from '../queries/useMediaCommands';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Button from '../../../shared/ui/Button';
import Badge from '../../../shared/ui/Badge';
import '../media-management.css';

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

const TYPE_OPTIONS = [
  {
    type: 'Movie',
    label: 'Movie',
    description: 'Feature films, documentaries, and cinema releases.',
    icon: Film,
  },
  {
    type: 'TvSeries',
    label: 'TV Series',
    description: 'Series with season and episode management.',
    icon: Tv,
  },
  {
    type: 'Book',
    label: 'Book',
    description: 'Books with author, ISBN, page count, and subjects.',
    icon: BookOpen,
  },
];

const getDisplayType = (type) => (type === 'TvSeries' ? 'TV Series' : type || 'media');

const FormSection = ({ title, description, children }) => (
  <section className="staff-form-section" aria-labelledby={`${title.toLowerCase().replaceAll(' ', '-')}-section`}>
    <header className="staff-form-section__header">
      <h2 className="staff-form-section__title" id={`${title.toLowerCase().replaceAll(' ', '-')}-section`}>
        {title}
      </h2>
      {description ? <p className="staff-form-section__copy">{description}</p> : null}
    </header>
    {children}
  </section>
);

const Field = ({ label, children, hint }) => (
  <label className="staff-field">
    <span className="staff-label">{label}</span>
    {children}
    {hint ? <span className="staff-field__hint">{hint}</span> : null}
  </label>
);

const AdminHero = ({ eyebrow = 'Catalog operations', title = 'Add media', children, actions }) => (
  <header className="staff-hero">
    <div className="staff-hero__content">
      <p className="staff-eyebrow">{eyebrow}</p>
      <h1 className="staff-hero__title">{title}</h1>
      <p className="staff-hero__copy">
        Add movies, TV series, and books to the RateOple catalog with reviewable metadata before publishing through the media cart.
      </p>
      {children}
      {actions ? <div className="staff-hero__actions">{actions}</div> : null}
    </div>
  </header>
);

const AddMediaPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminFlow = searchParams.get('from') === 'admin';
  const cartPath = isAdminFlow ? '/cart?from=admin' : '/cart';
  const cancelPath = isAdminFlow ? '/admin/media' : '/media';
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
  const [mediaType, setMediaType] = useState(null);
  const [genres, setGenres] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const searchTimeout = useRef(null);
  const [selectedTmdbSeries, setSelectedTmdbSeries] = useState(null);
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
  const [justAddedSeries, setJustAddedSeries] = useState(false);

  useEffect(() => {
    getGenres().then(setGenres).catch(() => setGenres([]));
  }, [getGenres]);

  useEffect(() => {
    if (step !== STEPS.SEARCH || !searchQuery.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return undefined;
    }

    clearTimeout(searchTimeout.current);
    setSearchLoading(true);
    setSearchError(null);

    searchTimeout.current = setTimeout(async () => {
      try {
        if (mediaType === 'Book') {
          const results = await searchBooks(searchQuery);
          setSearchResults(results.map((result) => ({
            id: result.olId,
            title: result.title,
            subtitle: result.authorName ?? '',
            coverUrl: result.coverUrl ?? null,
            year: result.firstPublishYear ?? null,
            _raw: result,
          })));
        } else {
          const type = mediaType === 'TvSeries' ? 'tv' : 'movie';
          const response = await searchTmdb(searchQuery, type);
          setSearchResults((response.data ?? []).map((result) => ({
            id: result.tmdbId,
            title: result.title,
            subtitle: result.releaseYear ? String(result.releaseYear) : '',
            coverUrl: result.coverUrl ?? null,
            year: result.releaseYear ?? null,
            _raw: result,
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

  const resetFormForType = (type) => {
    setForm({
      title: '', description: '', coverUrl: '', releaseYear: '',
      director: '', duration: '',
      author: '', pages: '', isbn: '', subjects: '',
      tmdbId: null, olId: null,
      genreIds: [],
      seasons: type === 'TvSeries' ? [emptySeason(1)] : [],
    });
  };

  const handleSelectType = (type) => {
    setMediaType(type);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedTmdbSeries(null);
    setJustAddedSeries(false);
    resetFormForType(type);
    setStep(STEPS.SEARCH);
  };

  const handleSelectResult = async (result) => {
    try {
      if (mediaType === 'Book') {
        const details = await getBookDetails(result._raw.olId);
        setForm({
          title: details.title ?? '',
          description: details.description ?? '',
          coverUrl: details.coverUrl ?? '',
          releaseYear: details.firstPublishYear ? String(details.firstPublishYear) : '',
          author: details.author ?? '',
          pages: details.pages ? String(details.pages) : '',
          isbn: details.isbn ?? '',
          subjects: (details.subjects ?? []).slice(0, 5).join(', '),
          director: '', duration: '',
          tmdbId: null,
          olId: details.olId ?? result._raw.olId,
          genreIds: [],
          seasons: [],
        });
        setSelectedTmdbSeries(null);
      } else {
        const type = mediaType === 'TvSeries' ? 'tv' : 'movie';
        const response = await getTmdbDetails(result._raw.tmdbId, type);
        const details = response.data;
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
          .filter((genre) => details.genres?.includes(genre.name))
          .map((genre) => genre.id);

        setForm({
          title: details.title ?? '',
          description: details.description ?? '',
          coverUrl: details.coverUrl ?? '',
          releaseYear: details.releaseYear ? String(details.releaseYear) : '',
          director: details.director ?? '',
          duration: details.duration ? String(details.duration) : '',
          author: '', pages: '', isbn: '', subjects: '',
          tmdbId: details.tmdbId,
          olId: null,
          genreIds: matchedGenreIds,
          seasons: mediaType === 'TvSeries'
            ? (seriesSeasons.length > 0 ? seriesSeasons : [emptySeason(1)])
            : [],
        });

        if (mediaType === 'TvSeries') {
          setSelectedTmdbSeries({ tmdbId: details.tmdbId });
        }
      }
    } catch {
      setForm((prev) => ({
        ...prev,
        title: result.title ?? '',
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
    resetFormForType(mediaType);
    setSelectedTmdbSeries(null);
    setStep(STEPS.FILL_FORM);
  };

  const toggleGenre = (id) => {
    setForm((prev) => ({
      ...prev,
      genreIds: prev.genreIds.includes(id)
        ? prev.genreIds.filter((genreId) => genreId !== id)
        : [...prev.genreIds, id],
    }));
  };

  const addSeasonToSeries = () => {
    setForm((prev) => ({
      ...prev,
      seasons: [...(prev.seasons ?? []), emptySeason((prev.seasons?.length ?? 0) + 1)],
    }));
  };

  const removeSeasonFromSeries = (seasonIdx) => {
    setForm((prev) => ({
      ...prev,
      seasons: (prev.seasons ?? [])
        .filter((_, idx) => idx !== seasonIdx)
        .map((season, idx) => ({ ...season, seasonNumber: idx + 1 })),
    }));
  };

  const addEpisodeToSeason = (seasonIdx) => {
    setForm((prev) => ({
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
    setForm((prev) => ({
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
    setForm((prev) => ({
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
            duration: episode.duration ? parseInt(episode.duration, 10) : null,
          })),
        }))
        : [];

      addItem(mediaType, {
        ...form,
        releaseYear: form.releaseYear ? parseInt(form.releaseYear, 10) : null,
        duration: form.duration ? parseInt(form.duration, 10) : null,
        pages: form.pages ? parseInt(form.pages, 10) : null,
        seasons: mappedSeasons,
      });

      if (mediaType === 'TvSeries') {
        setJustAddedSeries(true);
      } else {
        navigate(cartPath);
      }
    } catch {
      setSaveError('Failed to add to cart.');
    } finally {
      setSaving(false);
    }
  };

  const f = (field) => form[field];
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const displayType = getDisplayType(mediaType);

  if (step === STEPS.SELECT_TYPE) {
    return (
      <PageLayout>
        <Container size="xxl">
          <div className="staff-workspace">
            <AdminHero>
              <div className="staff-hero__meta">
                <Badge>Movie</Badge>
                <Badge>TV Series</Badge>
                <Badge>Book</Badge>
              </div>
            </AdminHero>

            <section className="staff-panel" aria-labelledby="media-type-title">
              <div className="staff-form-section__header">
                <h2 className="staff-form-section__title" id="media-type-title">Choose media type</h2>
                <p className="staff-form-section__copy">Select the catalog payload first so only supported fields appear.</p>
              </div>
              <div className="staff-type-grid">
                {TYPE_OPTIONS.map(({ type, label, description, icon }) => (
                  <button
                    key={type}
                    type="button"
                    className="staff-type-card"
                    onClick={() => handleSelectType(type)}
                  >
                    <span className="staff-type-card__icon" aria-hidden="true">
                      {createElement(icon, { size: 28, strokeWidth: 2.2 })}
                    </span>
                    <span>
                      <span className="staff-type-card__title">{label}</span>
                      <span className="staff-type-card__copy">{description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (step === STEPS.SEARCH) {
    const isBook = mediaType === 'Book';
    const sourceName = isBook ? 'Open Library' : 'TMDB';
    const placeholder = isBook
      ? 'Search by title, author, ISBN'
      : mediaType === 'TvSeries' ? 'Search TV series' : 'Search movies';

    return (
      <PageLayout>
        <Container size="xxl">
          <div className="staff-workspace">
            <AdminHero
              eyebrow="Catalog lookup"
              title={`Search ${displayType}`}
              actions={(
                <Button type="button" variant="ghost" onClick={() => setStep(STEPS.SELECT_TYPE)}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  Change type
                </Button>
              )}
            >
              <p className="staff-hero__copy">
                Search {sourceName} to prefill supported fields, or continue manually when the title is not available.
              </p>
            </AdminHero>

            <section className="staff-panel staff-search-panel" aria-labelledby="media-search-title">
              <div className="staff-form-section__header">
                <h2 className="staff-form-section__title" id="media-search-title">Find source metadata</h2>
                <p className="staff-form-section__copy">Imported values can still be edited before adding the item to cart.</p>
              </div>

              <label className="staff-field" htmlFor="media-source-search">
                <span className="staff-label">{sourceName} search</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
                  <input
                    id="media-source-search"
                    className="ui-input pl-9"
                    type="text"
                    placeholder={placeholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </label>

              {searchLoading ? <InlineMessage tone="info">Searching...</InlineMessage> : null}
              {searchError ? <InlineMessage tone="error">{searchError}</InlineMessage> : null}

              <div className="staff-search-results" aria-live="polite">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="staff-search-result"
                    onClick={() => handleSelectResult(result)}
                  >
                    <span className="staff-search-result__cover" aria-hidden="true">
                      {result.coverUrl ? <img src={result.coverUrl} alt="" /> : <ImageIcon size={18} />}
                    </span>
                    <span>
                      <span className="staff-search-result__title">{result.title}</span>
                      {result.subtitle ? <span className="staff-search-result__meta">{result.subtitle}</span> : null}
                    </span>
                  </button>
                ))}
              </div>

              <div className="staff-actions">
                <Button type="button" variant="primary" onClick={handleSkipSearch}>
                  Continue manually
                </Button>
                <Button type="button" variant="ghost" onClick={() => setStep(STEPS.SELECT_TYPE)}>
                  Cancel
                </Button>
              </div>
            </section>
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (justAddedSeries) {
    return (
      <PageLayout>
        <Container size="xxl">
          <div className="staff-workspace">
            <section className="staff-panel text-center">
              <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--primary-color-alpha)] text-[var(--accent)]">
                <Tv size={28} aria-hidden="true" />
              </span>
              <h1 className="ui-page-title">"{form.title}" added to cart</h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--text-muted)]">
                Submit the cart to create the series, then manage seasons and episodes from the series workflow.
                {selectedTmdbSeries ? ' TMDB data is ready to help seed those records.' : ''}
              </p>
              <div className="staff-actions mt-5 justify-center">
                <Button variant="primary" onClick={() => navigate(cartPath)}>
                  <ShoppingCart size={16} aria-hidden="true" />
                  Go to cart and submit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep(STEPS.SELECT_TYPE);
                    setJustAddedSeries(false);
                    setMediaType(null);
                  }}
                >
                  Add another title
                </Button>
              </div>
            </section>
          </div>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container size="xxl">
        <div className="staff-workspace">
          <AdminHero
            eyebrow="Catalog entry"
            title={`Add ${displayType}`}
            actions={(
              <>
                <Button type="button" variant="ghost" onClick={() => setStep(STEPS.SEARCH)}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  Back to search
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate(cancelPath)}>
                  Cancel
                </Button>
              </>
            )}
          >
            <div className="staff-hero__meta">
              <Badge>{displayType}</Badge>
              {mediaType === 'TvSeries' ? <Badge tone="info">Season-capable</Badge> : null}
            </div>
          </AdminHero>

          {mediaType === 'TvSeries' ? (
            <InlineMessage tone="info">
              After submitting the cart, use the season manager to maintain the live season and episode records.
              {selectedTmdbSeries ? ' TMDB seasons were imported into this draft.' : ''}
            </InlineMessage>
          ) : null}

          <form className="staff-form" onSubmit={handleSubmit}>
            <FormSection
              title="Basic identity"
              description="Core catalog identity used across search, detail pages, lists, and staff workflows."
            >
              <div className="staff-form-grid staff-form-grid--two">
                <Field label="Title *">
                  <input className="ui-input" required value={f('title')} onChange={set('title')} />
                </Field>
                <Field label="Type">
                  <input className="ui-input" value={displayType} readOnly />
                </Field>
                <Field label="Release year">
                  <input className="ui-input" type="number" min="1800" max="2100" value={f('releaseYear')} onChange={set('releaseYear')} />
                </Field>
              </div>
            </FormSection>

            <FormSection
              title="Artwork"
              description="Poster or cover imagery shown throughout RateOple."
            >
              <div className="staff-form-grid staff-form-grid--artwork">
                <div className="staff-cover-preview" aria-label="Cover preview">
                  {f('coverUrl') ? (
                    <img
                      src={f('coverUrl')}
                      alt="Cover preview"
                      onError={(event) => { event.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span>No image</span>
                  )}
                </div>
                <Field label="Cover image URL" hint="Paste a direct poster or book cover URL.">
                  <input className="ui-input" value={f('coverUrl')} onChange={set('coverUrl')} placeholder="https://..." />
                </Field>
              </div>
            </FormSection>

            <FormSection
              title="Metadata"
              description="Only fields supported by this media type are shown and sent."
            >
              <div className="staff-form-grid staff-form-grid--two">
                {mediaType === 'Movie' ? (
                  <>
                    <Field label="Director">
                      <input className="ui-input" value={f('director')} onChange={set('director')} />
                    </Field>
                    <Field label="Runtime in minutes">
                      <input className="ui-input" type="number" min="1" value={f('duration')} onChange={set('duration')} />
                    </Field>
                  </>
                ) : null}

                {mediaType === 'Book' ? (
                  <>
                    <Field label="Author">
                      <input className="ui-input" value={f('author')} onChange={set('author')} />
                    </Field>
                    <Field label="Pages">
                      <input className="ui-input" type="number" min="1" value={f('pages')} onChange={set('pages')} />
                    </Field>
                    <Field label="ISBN">
                      <input className="ui-input" value={f('isbn')} onChange={set('isbn')} />
                    </Field>
                    {f('subjects') ? (
                      <Field label="Subjects">
                        <input className="ui-input" value={f('subjects')} onChange={set('subjects')} />
                      </Field>
                    ) : null}
                  </>
                ) : null}
              </div>

              {Array.isArray(genres) && genres.length > 0 ? (
                <fieldset className="staff-field">
                  <legend className="staff-label">Genres</legend>
                  <div className="staff-chip-grid">
                    {genres.map((genre) => (
                      <label key={genre.id} className="staff-chip">
                        <input
                          type="checkbox"
                          className="ui-checkbox"
                          checked={form.genreIds.includes(genre.id)}
                          onChange={() => toggleGenre(genre.id)}
                        />
                        {genre.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </FormSection>

            <FormSection
              title="Description"
              description="Overview copy used on the public media detail page."
            >
              <Field label="Description">
                <textarea className="ui-input min-h-[132px] resize-y" rows={5} value={f('description')} onChange={set('description')} />
              </Field>
            </FormSection>

            {mediaType === 'TvSeries' ? (
              <FormSection
                title="Draft seasons and episodes"
                description="These records are included with the TV series payload when the cart is submitted."
              >
                <div className="staff-season-builder">
                  <div className="staff-season-builder__header">
                    <p className="staff-form-section__copy">
                      Review imported seasons or add placeholders before submitting.
                    </p>
                    <Button type="button" onClick={addSeasonToSeries}>
                      <Plus size={16} aria-hidden="true" />
                      Add season
                    </Button>
                  </div>

                  {(form.seasons ?? []).length === 0 ? (
                    <InlineMessage tone="info">No seasons yet. Add a season with at least one episode.</InlineMessage>
                  ) : null}

                  {(form.seasons ?? []).map((season, seasonIdx) => (
                    <article key={seasonIdx} className="staff-season-card">
                      <header className="staff-season-card__header">
                        <h3 className="staff-season-card__title">Season {seasonIdx + 1}</h3>
                        <Button type="button" size="sm" variant="danger" onClick={() => removeSeasonFromSeries(seasonIdx)}>
                          <X size={14} aria-hidden="true" />
                          Remove season
                        </Button>
                      </header>

                      <div className="staff-episode-list">
                        {(season.episodes ?? []).map((episode, episodeIdx) => (
                          <div key={episodeIdx} className="staff-episode-row">
                            <span className="staff-episode-index">E{episodeIdx + 1}</span>
                            <Field label={`Season ${seasonIdx + 1} episode ${episodeIdx + 1} title`}>
                              <input
                                className="ui-input"
                                value={episode.title}
                                onChange={(e) => setSeasonEpisodeField(seasonIdx, episodeIdx, 'title', e.target.value)}
                              />
                            </Field>
                            <Field label="Minutes">
                              <input
                                className="ui-input"
                                type="number"
                                min="1"
                                value={episode.duration}
                                onChange={(e) => setSeasonEpisodeField(seasonIdx, episodeIdx, 'duration', e.target.value)}
                              />
                            </Field>
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => removeEpisodeFromSeason(seasonIdx, episodeIdx)}
                              disabled={(season.episodes?.length ?? 0) === 1}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div>
                        <Button type="button" size="sm" onClick={() => addEpisodeToSeason(seasonIdx)}>
                          <Plus size={14} aria-hidden="true" />
                          Add episode
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </FormSection>
            ) : null}

            {saveError ? <InlineMessage tone="error">{saveError}</InlineMessage> : null}

            <div className="staff-sticky-actions">
              <span className="text-sm text-[var(--text-muted)]">
                Review the payload, then add it to the media cart for submission.
              </span>
              <div className={clsx('staff-actions', 'ml-auto')}>
                <Button type="submit" variant="primary" disabled={saving}>
                  <ShoppingCart size={16} aria-hidden="true" />
                  {saving ? 'Saving...' : 'Add to cart'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate(cancelPath)}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Container>
    </PageLayout>
  );
};

export default AddMediaPage;
