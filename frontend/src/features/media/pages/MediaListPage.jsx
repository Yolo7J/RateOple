import { useState, useEffect } from 'react';
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
  error: 'text-[#ff6d75]',
  pagination: 'flex items-center justify-center gap-3',
  pageButton: [
    'rounded-xl border border-[var(--border)] bg-[var(--btn-bg)] px-4 py-2 text-sm',
    'text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)] disabled:opacity-50',
  ].join(' '),
  pageInfo: 'text-sm text-[var(--text-muted)]',
};

const MediaListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTypes = searchParams.get('types')?.split(',').filter(Boolean) ?? MEDIA_TYPES;
  const initialGenres = searchParams.get('genres')?.split(',').map(Number).filter(Boolean) ?? [];
  const initialSearch = searchParams.get('search') ?? '';
  const initialSort = searchParams.get('sort') ?? 'rating:desc';
  const parsedPage = Number(searchParams.get('page') ?? 1);
  const initialPage = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

  const [selectedTypes, setSelectedTypes] = useState(initialTypes);
  const [selectedGenres, setSelectedGenres] = useState(initialGenres);
  const [search, setSearch] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);

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

  useEffect(() => {
    const params = {};
    if (selectedTypes.length < 3) params.types = selectedTypes.join(',');
    if (selectedGenres.length > 0) params.genres = selectedGenres.join(',');
    if (search) params.search = search;
    if (sort !== 'rating:desc') params.sort = sort;
    if (page > 1) params.page = page;
    setSearchParams(params, { replace: true });
  }, [selectedTypes, selectedGenres, search, sort, page, setSearchParams]);

  const errorMessage = error ? (error?.response?.data?.message || 'Failed to load media.') : null;

  const toggleType = (type) => {
    setPage(1);
    setSelectedTypes((prev) =>
      prev.includes(type) ? (prev.length > 1 ? prev.filter((t) => t !== type) : prev) : [...prev, type],
    );
  };

  const toggleGenre = (id) => {
    setPage(1);
    setSelectedGenres((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <PageLayout>
      <Container size="full">
        <Stack className={styles.pageStack}>
          <div className={styles.toolbar}>
            <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search titles..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" className={styles.searchButton}>Search</button>
            </form>

            <select
              className={styles.sortSelect}
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {user ? (
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
              {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

              {loading ? (
                <Grid cols={styles.grid}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className={styles.skeletonCard} />
                  ))}
                </Grid>
              ) : (result?.items?.length ?? 0) === 0 ? (
                <div className={styles.empty}>
                  <p>No media found. Try adjusting your filters.</p>
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
                  <button className={styles.pageButton} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    ← Prev
                  </button>
                  <span className={styles.pageInfo}>Page {page} of {result?.totalPages ?? 1}</span>
                  <button
                    className={styles.pageButton}
                    disabled={page >= (result?.totalPages ?? 1)}
                    onClick={() => setPage((p) => p + 1)}
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
