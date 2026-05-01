import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { MEDIA_TYPES } from '../../../shared/constants/mediaTypes';
import { useMediaGenresQuery } from '../queries/useMediaGenresQuery';
import { useMediaListQuery } from '../queries/useMediaListQuery';
import MediaCard from '../components/MediaCard/MediaCard';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';

const SORT_OPTIONS = [
  { value: 'rating:desc', label: 'Top Rated' },
  { value: 'rating:asc', label: 'Lowest Rated' },
  { value: 'year:desc', label: 'Newest' },
  { value: 'year:asc', label: 'Oldest' },
  { value: 'title:asc', label: 'A – Z' },
  { value: 'title:desc', label: 'Z – A' },
];
const PAGE_SIZE = 24;

const styles = {
  pageStack: 'gap-6',
  toolbar: [
    'flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)]',
    'bg-[linear-gradient(140deg,var(--bg-elevated),var(--card-bg))] p-4',
    'shadow-[0_12px_30px_-22px_var(--shadow-color)]',
  ].join(' '),
  searchForm: 'flex min-w-[220px] flex-1',
  searchInput: [
    'h-11 flex-1 rounded-l-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm',
    'text-[var(--text-primary)] outline-none',
  ].join(' '),
  searchButton: [
    'h-11 rounded-r-xl border border-[var(--border)] bg-[var(--btn-bg)] px-4 text-sm',
    'text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)]',
  ].join(' '),
  clearButton: [
    'h-11 rounded-xl border border-[var(--border)] bg-transparent px-4 text-sm',
    'text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)]',
  ].join(' '),
  sortSelect: [
    'h-11 min-w-[160px] rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 text-sm',
    'text-[var(--text-primary)]',
  ].join(' '),
  addButton: [
    'h-11 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-[#151515]',
    'shadow-[0_8px_20px_-14px_rgba(245,197,24,0.9)] transition hover:bg-[var(--accent-strong)]',
    'sm:ml-auto',
  ].join(' '),
  layout: 'grid grid-cols-1 gap-5 lg:grid-cols-[250px_minmax(0,1fr)]',
  filters: [
    'flex flex-wrap gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4',
    'lg:sticky lg:top-24 lg:max-h-[calc(100vh-105px)] lg:flex-col lg:overflow-auto',
  ].join(' '),
  filterSection: 'flex flex-col gap-2',
  filterHeading: 'text-xs uppercase tracking-[0.09em] text-[var(--text-muted)]',
  filterCheckbox: 'flex items-center gap-2 text-sm text-[var(--text-primary)]',
  gridArea: 'flex min-w-0 flex-col gap-5',
  grid: 'grid-cols-[repeat(auto-fill,minmax(180px,1fr))] max-sm:grid-cols-[repeat(auto-fill,minmax(146px,1fr))] gap-4',
  skeletonCard: [
    'aspect-[2/3] rounded-xl bg-[var(--skeleton-a)] animate-pulse',
  ].join(' '),
  empty: [
    'rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-12 text-center',
    'text-[var(--text-muted)]',
  ].join(' '),
  resultHeading: 'text-lg font-semibold text-[var(--text-primary)]',
  error: 'text-[#ff6d75]',
  pagination: 'flex items-center justify-center gap-3',
  pageButton: [
    'rounded-xl border border-[var(--border)] bg-[var(--btn-bg)] px-4 py-2 text-sm',
    'text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)] disabled:opacity-50',
  ].join(' '),
  pageInfo: 'text-sm text-[var(--text-muted)]',
};

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

const MediaListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canAddMedia = Array.isArray(user?.roles)
    ? user.roles.some((role) => ['Admin', 'SuperAdmin'].includes(role))
    : false;

  const selectedTypes = parseTypes(searchParams.get('types'));
  const selectedGenres = parseGenres(searchParams.get('genres'));
  const search = searchParams.get('search')?.trim() ?? '';
  const sort = searchParams.get('sort') ?? 'rating:desc';
  const page = parsePage(searchParams.get('page'));

  const [sortBy, sortDir] = sort.split(':');
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
  const genres = Array.isArray(genresData) ? genresData : [];

  useEffect(() => {
    if (genresError?.response?.status === 401) {
      navigate('/login');
    }
  }, [genresError, navigate]);

  const errorMessage = error ? (error?.response?.data?.message || 'Failed to load media.') : null;

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
    if (params.get('sort') === 'rating:desc') params.delete('sort');
    if (params.get('page') === '1') params.delete('page');

    setSearchParams(params);
  };

  const toggleType = (type) => {
    const nextTypes = selectedTypes.includes(type)
      ? (selectedTypes.length > 1 ? selectedTypes.filter((t) => t !== type) : selectedTypes)
      : [...selectedTypes, type];

    updateSearchParams({ types: nextTypes, page: 1 });
  };

  const toggleGenre = (id) => {
    const nextGenres = selectedGenres.includes(id)
      ? selectedGenres.filter((g) => g !== id)
      : [...selectedGenres, id];

    updateSearchParams({ genres: nextGenres, page: 1 });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateSearchParams({ search: String(formData.get('search') ?? '').trim(), page: 1 });
  };

  const clearSearch = () => updateSearchParams({ search: '', page: 1 });

  return (
    <PageLayout>
      <Container size="full">
        <Stack className={styles.pageStack}>
          <div className={styles.toolbar}>
            <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
              <input
                type="text"
                name="search"
                key={search}
                className={styles.searchInput}
                placeholder="Search titles..."
                defaultValue={search}
              />
              <button type="submit" className={styles.searchButton}>Search</button>
            </form>

            {search ? (
              <button type="button" className={styles.clearButton} onClick={clearSearch}>
                Clear search
              </button>
            ) : null}

            <select
              className={styles.sortSelect}
              value={sort}
              onChange={(e) => updateSearchParams({ sort: e.target.value, page: 1 })}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {canAddMedia ? (
              <button className={styles.addButton} onClick={() => navigate('/media/add')}>
                + Add Media
              </button>
            ) : null}
          </div>

          <div className={styles.layout}>
            <aside className={styles.filters}>
              <div className={styles.filterSection}>
                <h4 className={styles.filterHeading}>Type</h4>
                {MEDIA_TYPES.map((type) => (
                  <label key={type} className={styles.filterCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                      className="accent-[var(--accent)]"
                    />
                    {type === 'TvSeries' ? 'TV Series' : type}
                  </label>
                ))}
              </div>

              {Array.isArray(genres) && genres.length > 0 ? (
                <div className={styles.filterSection}>
                  <h4 className={styles.filterHeading}>Genre</h4>
                  {genres.map((g) => (
                    <label key={g.id} className={styles.filterCheckbox}>
                      <input
                        type="checkbox"
                        checked={selectedGenres.includes(g.id)}
                        onChange={() => toggleGenre(g.id)}
                        className="accent-[var(--accent)]"
                      />
                      {g.name}
                    </label>
                  ))}
                </div>
              ) : null}
            </aside>

            <main className={styles.gridArea}>
              {search ? (
                <h2 className={styles.resultHeading}>Search results for "{search}"</h2>
              ) : null}

              {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

              {loading ? (
                <Grid cols={styles.grid}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className={styles.skeletonCard} />
                  ))}
                </Grid>
              ) : (result?.items?.length ?? 0) === 0 ? (
                <div className={styles.empty}>
                  <p>
                    {search
                      ? `No media found for "${search}". Try another search or clear filters.`
                      : 'No media found. Try adjusting your filters.'}
                  </p>
                </div>
              ) : (
                <Grid cols={styles.grid}>
                  {(result?.items ?? []).map((m) => (
                    <MediaCard key={m.id} media={m} />
                  ))}
                </Grid>
              )}

              {(result?.totalPages ?? 1) > 1 ? (
                <div className={styles.pagination}>
                  <button
                    className={styles.pageButton}
                    disabled={page <= 1}
                    onClick={() => updateSearchParams({ page: page - 1 })}
                  >
                    ← Prev
                  </button>
                  <span className={styles.pageInfo}>Page {page} of {result?.totalPages ?? 1}</span>
                  <button
                    className={styles.pageButton}
                    disabled={page >= (result?.totalPages ?? 1)}
                    onClick={() => updateSearchParams({ page: page + 1 })}
                  >
                    Next →
                  </button>
                </div>
              ) : null}
            </main>
          </div>
        </Stack>
      </Container>
    </PageLayout>
  );
};

export default MediaListPage;
