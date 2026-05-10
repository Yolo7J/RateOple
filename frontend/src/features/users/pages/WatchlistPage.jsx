import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { BookmarkCheck, Film, ListFilter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { STATUS_TYPES } from '../../../shared/constants/statusTypes';
import { useWatchlistQuery } from '../queries/useWatchlistQuery';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import MediaCard from '../../../shared/components/MediaCard/MediaCard';
import { formatDate } from '../../../shared/utils/formatDate';
import '../users.css';

const ORDER = STATUS_TYPES;

const STATUS_COPY = {
  Plan: 'Queued titles for later.',
  'On it': 'Movies, series, and books in progress.',
  Done: 'Finished titles from your shelf.',
  Dropped: 'Titles you stepped away from.',
};

const toMediaCard = (item) => ({
  id: item.mediaId,
  type: item.mediaType,
  title: item.title,
  coverUrl: item.coverUrl,
  status: item.status,
});

const getProgressLabel = (item) => {
  const parts = [];
  if (item?.progressSeason) parts.push(`Season ${item.progressSeason}`);
  if (item?.progressEpisode) parts.push(`Episode ${item.progressEpisode}`);
  if (item?.progressPages) parts.push(`${item.progressPages} pages`);
  return parts.join(' / ');
};

function WatchlistPage() {
  const [activeStatus, setActiveStatus] = useState(ORDER[0]);
  const { data, loading, error } = useWatchlistQuery();
  const errorMessage = error?.response?.data?.message || 'Failed to load watchlist.';

  const groups = useMemo(() => {
    const items = Array.isArray(data) ? data : [];
    return ORDER.reduce((acc, key) => {
      acc[key] = items.filter((x) => (x.status || '').toLowerCase() === key.toLowerCase());
      return acc;
    }, {});
  }, [data]);

  const activeItems = groups[activeStatus] ?? [];
  const totalItems = Array.isArray(data) ? data.length : 0;

  return (
    <PageLayout>
      <Container>
        <Stack className="gap-6">
          <section className="watchlist-hero" aria-labelledby="watchlist-title">
            <div>
              <p className="account-eyebrow">Tracked media</p>
              <h1 id="watchlist-title">Watchlist</h1>
              <p>
                Movies, TV series, and books you plan, are watching or reading, finished, or dropped.
              </p>
            </div>
            <div className="watchlist-hero-stat" aria-label={`${totalItems} tracked titles`}>
              <BookmarkCheck size={22} aria-hidden="true" />
              <strong>{totalItems}</strong>
              <span>tracked titles</span>
            </div>
          </section>

          {loading ? <LoadingState label="Loading watchlist..." /> : null}
          {error ? <InlineMessage tone="error">{errorMessage}</InlineMessage> : null}

          {!loading && !error ? (
            <>
              <section className="watchlist-tabs" aria-label="Watchlist status filters">
                <div className="watchlist-tabs-label">
                  <ListFilter size={17} aria-hidden="true" />
                  <span>Status</span>
                </div>
                <div className="watchlist-tab-list" role="tablist" aria-label="Tracked media statuses">
                  {ORDER.map((status) => {
                    const selected = activeStatus === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        className={clsx('watchlist-tab', selected && 'watchlist-tab--active')}
                        onClick={() => setActiveStatus(status)}
                      >
                        <span>{status}</span>
                        <Badge tone={selected ? 'accent' : 'neutral'}>{groups[status]?.length ?? 0}</Badge>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section
                className="watchlist-shelf"
                role="tabpanel"
                aria-label={`${activeStatus} media`}
              >
                <div className="watchlist-shelf-header">
                  <div>
                    <h2>{activeStatus}</h2>
                    <p>{STATUS_COPY[activeStatus] ?? 'Tracked titles in this status.'}</p>
                  </div>
                  <Badge tone="accent">{activeItems.length}</Badge>
                </div>

                {activeItems.length ? (
                  <div className="watchlist-card-grid">
                    {activeItems.map((item) => {
                      const progress = getProgressLabel(item);
                      return (
                        <article key={item.mediaId} className="watchlist-card-shell">
                          <MediaCard media={toMediaCard(item)} size="sm" />
                          <div className="watchlist-card-meta">
                            <span>{progress || 'No progress saved'}</span>
                            <span>{formatDate(item.updatedAt)}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title={`No ${activeStatus.toLowerCase()} titles`}
                    description={`Nothing is marked as ${activeStatus.toLowerCase()} yet.`}
                    action={(
                      <Button as={Link} to="/media">
                        <Film size={16} aria-hidden="true" />
                        Browse media
                      </Button>
                    )}
                  />
                )}
              </section>
            </>
          ) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default WatchlistPage;
