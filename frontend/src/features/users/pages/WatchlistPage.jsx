import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUS_TYPES } from '../../../shared/constants/statusTypes';
import { useWatchlistQuery } from '../queries/useWatchlistQuery';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';
import Badge from '../../../shared/ui/Badge';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import PageHeader from '../../../shared/ui/PageHeader';
import SectionCard from '../../../shared/ui/SectionCard';

const ORDER = STATUS_TYPES;

const styles = {
  pageStack: 'gap-6',
  grid: 'gap-3',
  item: 'ui-card-interactive flex min-h-[86px] items-center gap-3 px-3 py-2 text-left text-[var(--text-primary)]',
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
          <PageHeader
            title="Watchlist"
            subtitle="Track what you plan to watch, are watching, completed, paused, or dropped."
          />
          {loading ? <LoadingState label="Loading watchlist..." /> : null}
          {error ? <InlineMessage tone="error">{errorMessage}</InlineMessage> : null}

          {!loading && !error ? ORDER.map((status) => (
            <SectionCard
              key={status}
              title={status}
              actions={<Badge>{groups[status]?.length ?? 0}</Badge>}
            >
              {!groups[status]?.length ? (
                <EmptyState title="No media" description={`Nothing is marked as ${status.toLowerCase()} yet.`} />
              ) : null}
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
            </SectionCard>
          )) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default WatchlistPage;
