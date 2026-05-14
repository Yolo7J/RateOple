import { createElement, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Film,
  Grid3X3,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tv,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../../context/AuthContext';
import { MEDIA_TYPES } from '../../../shared/constants/mediaTypes';
import { useMediaGenresQuery } from '../queries/useMediaGenresQuery';
import { useMediaListQuery } from '../queries/useMediaListQuery';
import MediaCard from '../components/MediaCard/MediaCard';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Button from '../../../shared/ui/Button';
import Checkbox from '../../../shared/ui/Checkbox';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import { Skeleton } from '../../../shared/ui/LoadingState';
import '../media.css';

const SORT_OPTIONS = [
  { value: 'rating:desc', label: 'Top Rated' },
  { value: 'rating:asc', label: 'Lowest Rated' },
  { value: 'year:desc', label: 'Newest' },
  { value: 'year:asc', label: 'Oldest' },
  { value: 'title:asc', label: 'A - Z' },
  { value: 'title:desc', label: 'Z - A' },
];

const TYPE_OPTIONS = [
  { value: 'Movie', label: 'Movies', shortLabel: 'Movie', Icon: Film },
  { value: 'TvSeries', label: 'TV Series', shortLabel: 'Series', Icon: Tv },
  { value: 'Book', label: 'Books', shortLabel: 'Book', Icon: BookOpen },
];

const DEFAULT_SORT = 'rating:desc';
const PAGE_SIZE = 24;

const parseTypes = (value) => {
  const types = value?.split(',').filter((type) => MEDIA_TYPES.includes(type)) ?? MEDIA_TYPES;
  return types.length > 0 ? types : MEDIA_TYPES;
};

const parseGenres = (value) => (
  value
    ?.split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0) ?? []
);

const parsePage = (value) => {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

const parseSort = (value) => (
  SORT_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_SORT
);

const formatShortTypeLabel = (type) => TYPE_OPTIONS.find((option) => option.value === type)?.shortLabel ?? type;
const formatCount = (value) => new Intl.NumberFormat().format(value);

const MediaListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchDraft, setSearchDraft] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const canAddMedia = Array.isArray(user?.roles)
    ? user.roles.some((role) => ['Admin', 'SuperAdmin'].includes(role))
    : false;

  const selectedTypes = useMemo(() => parseTypes(searchParams.get('types')), [searchParams]);
  const selectedGenres = useMemo(() => parseGenres(searchParams.get('genres')), [searchParams]);
  const search = searchParams.get('search')?.trim() ?? '';
  const sort = parseSort(searchParams.get('sort'));
  const page = parsePage(searchParams.get('page'));
  const [sortBy, sortDir] = sort.split(':');
  const allTypesSelected = selectedTypes.length === MEDIA_TYPES.length;

  const { data: genresData, error: genresError } = useMediaGenresQuery();
  const { data: result, loading, error } = useMediaListQuery({
    types: selectedTypes,
    genreIds: selectedGenres,
    search,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  });
  const genres = useMemo(() => (Array.isArray(genresData) ? genresData : []), [genresData]);
  const items = Array.isArray(result?.items) ? result.items : [];
  const totalCount = Number.isFinite(Number(result?.totalCount)) ? Number(result.totalCount) : 0;
  const totalPages = Math.max(1, Number(result?.totalPages) || 1);
  const selectedGenreNames = useMemo(() => {
    const genreMap = new Map(genres.map((genre) => [genre.id, genre.name]));
    return selectedGenres.map((id) => ({ id, name: genreMap.get(id) ?? `Genre ${id}` }));
  }, [genres, selectedGenres]);
  const activeFilterCount = (
    (search ? 1 : 0)
    + (allTypesSelected ? 0 : selectedTypes.length)
    + selectedGenres.length
    + (sort === DEFAULT_SORT ? 0 : 1)
  );
  const resultRange = totalCount > 0
    ? `${formatCount(((page - 1) * PAGE_SIZE) + 1)}-${formatCount(Math.min(page * PAGE_SIZE, totalCount))}`
    : '0';
  const resultLabel = loading
    ? 'Loading catalog'
    : `${formatCount(totalCount)} ${totalCount === 1 ? 'match' : 'matches'}`;
  const errorMessage = error ? (error?.response?.data?.message || 'Failed to load media.') : null;

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    if (genresError?.response?.status === 401) {
      navigate('/login');
    }
  }, [genresError, navigate]);

  useEffect(() => {
    if (!filtersOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFiltersOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [filtersOpen]);

  const updateSearchParams = (updates) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        params.delete(key);
        return;
      }

      params.set(key, Array.isArray(value) ? value.join(',') : String(value));
    });

    if ((params.get('types')?.split(',').filter(Boolean).length ?? MEDIA_TYPES.length) >= MEDIA_TYPES.length) {
      params.delete('types');
    }
    if (params.get('sort') === DEFAULT_SORT) params.delete('sort');
    if (params.get('page') === '1') params.delete('page');

    setSearchParams(params);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const toggleType = (type) => {
    let nextTypes;

    if (allTypesSelected) {
      nextTypes = [type];
    } else if (selectedTypes.includes(type)) {
      nextTypes = selectedTypes.length > 1
        ? selectedTypes.filter((selectedType) => selectedType !== type)
        : MEDIA_TYPES;
    } else {
      nextTypes = [...selectedTypes, type];
    }

    updateSearchParams({ types: nextTypes, page: 1 });
  };

  const toggleGenre = (id) => {
    const nextGenres = selectedGenres.includes(id)
      ? selectedGenres.filter((genreId) => genreId !== id)
      : [...selectedGenres, id];

    updateSearchParams({ genres: nextGenres, page: 1 });
  };

  const removeGenre = (id) => {
    updateSearchParams({ genres: selectedGenres.filter((genreId) => genreId !== id), page: 1 });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    updateSearchParams({ search: searchDraft.trim(), page: 1 });
  };

  const clearSearch = () => {
    setSearchDraft('');
    updateSearchParams({ search: '', page: 1 });
  };

  const renderFilterPanel = (sortId) => (
    <div className="media-explore-filter-panel">
      <div className="media-explore-filter-group">
        <div className="media-explore-filter-heading">
          <span>Media type</span>
          <button type="button" onClick={() => updateSearchParams({ types: MEDIA_TYPES, page: 1 })}>
            All
          </button>
        </div>
        <div className="media-explore-type-grid" role="group" aria-label="Media type filters">
          {TYPE_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              className={clsx('media-explore-type-toggle', !allTypesSelected && selectedTypes.includes(value) && 'is-active')}
              aria-pressed={!allTypesSelected && selectedTypes.includes(value)}
              onClick={() => toggleType(value)}
            >
              {createElement(Icon, { 'aria-hidden': 'true' })}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="media-explore-filter-group">
        <label className="media-explore-filter-heading" htmlFor={sortId}>
          <span>Sort by</span>
        </label>
        <Select
          id={sortId}
          value={sort}
          onChange={(event) => updateSearchParams({ sort: event.target.value, page: 1 })}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </div>

      <div className="media-explore-filter-group">
        <div className="media-explore-filter-heading">
          <span>Genres</span>
          {selectedGenres.length > 0 ? (
            <button type="button" onClick={() => updateSearchParams({ genres: [], page: 1 })}>
              Clear
            </button>
          ) : null}
        </div>
        {genres.length > 0 ? (
          <div className="media-explore-genre-list">
            {genres.map((genre) => (
              <label key={genre.id} className="media-explore-genre-option">
                <Checkbox
                  checked={selectedGenres.includes(genre.id)}
                  onChange={() => toggleGenre(genre.id)}
                />
                <span>{genre.name}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="media-explore-filter-note">
            {genresError ? 'Genre filters are unavailable right now.' : 'Loading genres...'}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <PageLayout>
      <main className="media-explore-page">
        <Container size="xxl">
          <section className="media-explore-hero" aria-labelledby="media-explore-title">
            <div className="media-explore-hero-copy">
              <span className="media-explore-kicker">
                <Grid3X3 aria-hidden="true" />
                RateOple catalog
              </span>
              <h1 id="media-explore-title">Explore media</h1>
              <p>Search movies, TV series, and books across the RateOple catalog.</p>
              <div className="media-explore-hero-actions">
                {canAddMedia ? (
                  <Button as={Link} to="/media/add" variant="primary" size="lg">
                    <Plus aria-hidden="true" />
                    Add Media
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="media-explore-search-card">
              <form className="media-explore-search-form" onSubmit={handleSearchSubmit}>
                <label htmlFor="media-search">Search catalog</label>
                <div className="media-explore-search-row">
                  <div className="media-explore-search-input">
                    <Search aria-hidden="true" />
                    <Input
                      id="media-search"
                      type="search"
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      placeholder="Search by title..."
                    />
                  </div>
                  <Button type="submit" variant="primary" size="lg">Search</Button>
                  {search ? (
                    <Button type="button" variant="ghost" size="lg" onClick={clearSearch}>
                      <X aria-hidden="true" />
                      Clear
                    </Button>
                  ) : null}
                </div>
              </form>

              <div className="media-explore-type-rail" role="group" aria-label="Quick media type filters">
                <button
                  type="button"
                  className={clsx('media-explore-type-chip', allTypesSelected && 'is-active')}
                  aria-pressed={allTypesSelected}
                  onClick={() => updateSearchParams({ types: MEDIA_TYPES, page: 1 })}
                >
                  All
                </button>
                {TYPE_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={clsx('media-explore-type-chip', !allTypesSelected && selectedTypes.includes(value) && 'is-active')}
                    aria-pressed={!allTypesSelected && selectedTypes.includes(value)}
                    onClick={() => toggleType(value)}
                  >
                    {createElement(Icon, { 'aria-hidden': 'true' })}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="media-explore-layout">
            <aside className="media-explore-sidebar" aria-label="Media filters">
              <div className="media-explore-sidebar-header">
                <div>
                  <span>Browse filters</span>
                  <strong>{activeFilterCount > 0 ? `${activeFilterCount} active` : 'Ready'}</strong>
                </div>
                {activeFilterCount > 0 ? (
                  <button type="button" onClick={clearAllFilters}>
                    <RotateCcw aria-hidden="true" />
                    Reset
                  </button>
                ) : null}
              </div>
              {renderFilterPanel('media-sort-sidebar')}
            </aside>

            <section className="media-explore-results" aria-labelledby="media-results-title">
              <div className="media-explore-results-toolbar">
                <div>
                  <h2 id="media-results-title">Catalog results</h2>
                  <p>
                    {resultLabel}
                    {!loading && totalCount > 0 ? `, showing ${resultRange}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="default"
                  className="media-explore-filter-button"
                  onClick={() => setFiltersOpen(true)}
                >
                  <SlidersHorizontal aria-hidden="true" />
                  Filters
                  {activeFilterCount > 0 ? <span>{activeFilterCount}</span> : null}
                </Button>
              </div>

              {activeFilterCount > 0 ? (
                <div className="media-explore-active-filters" aria-label="Active filters">
                  {search ? (
                    <button type="button" onClick={clearSearch}>
                      Search: {search}
                      <X aria-hidden="true" />
                    </button>
                  ) : null}
                  {!allTypesSelected ? selectedTypes.map((type) => (
                    <button key={type} type="button" onClick={() => toggleType(type)}>
                      {formatShortTypeLabel(type)}
                      <X aria-hidden="true" />
                    </button>
                  )) : null}
                  {selectedGenreNames.map((genre) => (
                    <button key={genre.id} type="button" onClick={() => removeGenre(genre.id)}>
                      {genre.name}
                      <X aria-hidden="true" />
                    </button>
                  ))}
                  {sort !== DEFAULT_SORT ? (
                    <button type="button" onClick={() => updateSearchParams({ sort: DEFAULT_SORT, page: 1 })}>
                      Sort: {SORT_OPTIONS.find((option) => option.value === sort)?.label}
                      <X aria-hidden="true" />
                    </button>
                  ) : null}
                  <button type="button" className="media-explore-clear-all" onClick={clearAllFilters}>
                    Clear all
                  </button>
                </div>
              ) : null}

              {errorMessage ? <InlineMessage tone="error">{errorMessage}</InlineMessage> : null}

              {loading ? (
                <div className="media-explore-results-grid" aria-label="Loading media">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="media-explore-skeleton-card">
                      <Skeleton className="media-explore-skeleton-poster" />
                      <Skeleton className="media-explore-skeleton-line" />
                      <Skeleton className="media-explore-skeleton-line short" />
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  title="No media found"
                  description="Try clearing filters or searching another title."
                  className="media-explore-empty"
                  action={(
                    <Button type="button" variant="primary" onClick={clearAllFilters}>
                      Clear filters
                    </Button>
                  )}
                />
              ) : (
                <div className="media-explore-results-grid">
                  {items.map((media) => (
                    <MediaCard key={media.id} media={media} />
                  ))}
                </div>
              )}

              {totalPages > 1 ? (
                <nav className="media-explore-pagination" aria-label="Media pagination">
                  <Button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => updateSearchParams({ page: page - 1 })}
                  >
                    <ArrowLeft aria-hidden="true" />
                    Previous
                  </Button>
                  <span>Page {page} of {totalPages}</span>
                  <Button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => updateSearchParams({ page: page + 1 })}
                  >
                    Next
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </nav>
              ) : null}
            </section>
          </div>
        </Container>

        {filtersOpen ? (
          <div className="media-explore-filter-sheet" role="presentation">
            <button
              type="button"
              className="media-explore-filter-backdrop"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
            />
            <section
              className="media-explore-filter-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="media-filter-title"
            >
              <div className="media-explore-filter-drawer-header">
                <div>
                  <h2 id="media-filter-title">Filters</h2>
                  <p>{activeFilterCount > 0 ? `${activeFilterCount} active filters` : 'Refine the catalog'}</p>
                </div>
                <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>
                  <X aria-hidden="true" />
                </button>
              </div>
              <div className="media-explore-filter-drawer-body">
                {renderFilterPanel('media-sort-drawer')}
              </div>
              <div className="media-explore-filter-drawer-actions">
                <Button type="button" variant="ghost" onClick={clearAllFilters} disabled={activeFilterCount === 0}>
                  Clear all
                </Button>
                <Button type="button" variant="primary" onClick={() => setFiltersOpen(false)}>
                  Apply filters
                </Button>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </PageLayout>
  );
};

export default MediaListPage;
