import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUS_TYPES } from '../../../shared/constants/statusTypes';
import { useWatchlistQuery } from '../queries/useWatchlistQuery';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';

const ORDER = STATUS_TYPES;

const styles = {
  pageStack: 'gap-6',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  muted: 'text-[var(--text-muted)]',
  error: 'text-[#ff7f7f]',
  statusGroup: 'rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4',
  statusTitle: 'mb-3 text-lg font-semibold text-[var(--text-primary)]',
  grid: 'gap-3',
  item: [
    'flex items-center gap-3 rounded-lg border border-[var(--border)]',
    'bg-[var(--bg-secondary)] px-3 py-2 text-left text-[var(--text-primary)]',
    'transition hover:bg-[var(--card-hover)]',
  ].join(' '),
  itemImage: 'h-[60px] w-[40px] flex-shrink-0 rounded object-cover',
};

function WatchlistPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useWatchlistQuery();
  const errorMessage = error?.response?.data?.message || 'Failed to load watchlist.';

  const groups = useMemo(() => {
    const items = Array.isArray(data) ? data : [];
    return ORDER.reduce((acc, key) => {
      acc[key] = items.filter((x) => (x.status || '').toLowerCase() === key.toLowerCase());
      return acc;
    }, {});
  }, [data]);

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <h1 className={styles.title}>Watchlist</h1>
          {loading ? <p className={styles.muted}>Loading watchlist...</p> : null}
          {error ? <p className={styles.error}>{errorMessage}</p> : null}

          {!loading && !error ? ORDER.map((status) => (
            <section key={status} className={styles.statusGroup}>
              <h2 className={styles.statusTitle}>{status}</h2>
              {!groups[status]?.length ? <p className={styles.muted}>No media.</p> : null}
              <Grid variant="cards" className={styles.grid}>
                {groups[status]?.map((item) => (
                  <button
                    key={`${status}-${item.mediaId ?? item.id}`}
                    className={styles.item}
                    onClick={() => navigate(`/media/${item.mediaId ?? item.id}`)}
                  >
                    <img
                      className={styles.itemImage}
                      src={item.coverUrl || 'https://placehold.co/80x120?text=No+Image'}
                      alt={item.title}
                    />
                    <span>{item.title}</span>
                  </button>
                ))}
              </Grid>
            </section>
          )) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default WatchlistPage;
