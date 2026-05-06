import MediaRow from './MediaRow';
import DiscoverySectionHeader from './DiscoverySectionHeader';
import InlineMessage from '../../../shared/ui/InlineMessage';
import EmptyState from '../../../shared/ui/EmptyState';
import { Skeleton } from '../../../shared/ui/LoadingState';

const styles = {
  section: 'discovery-media-section',
  skeletonRow: 'discovery-media-skeleton-row',
};

function DiscoverySection({
  title,
  description,
  actionLabel = 'View all',
  actionTo = '/media',
  items,
  loading,
  error,
  emptyTitle = 'No items yet',
  emptyDescription = 'This section will fill in when matching media is available.',
}) {
    return (
        <section className={styles.section}>
            <DiscoverySectionHeader
              title={title}
              description={description}
              actionLabel={actionLabel}
              actionTo={actionTo}
            />
            {loading && (
              <div className={styles.skeletonRow} role="status" aria-label={`Loading ${title.toLowerCase()}...`}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="discovery-media-skeleton-card" />
                ))}
              </div>
            )}
            {error && <InlineMessage tone="error">{error}</InlineMessage>}
            {!loading && !error && <MediaRow items={items} />}
            {!loading && !error && !items?.length ? (
              <EmptyState
                title={emptyTitle}
                description={emptyDescription}
                className="discovery-empty-state"
              />
            ) : null}
        </section>
    );
}

export default DiscoverySection;
