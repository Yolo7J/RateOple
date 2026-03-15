import { useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import { useCollectionDetailsQuery } from '../queries/useCollectionDetailsQuery';
import { useCollectionsQuery } from '../queries/useCollectionsQuery';
import { useCollectionMutations } from '../queries/useCollectionMutations';
import CollectionTree from '../components/CollectionTree';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';

const styles = {
  pageStack: 'gap-6',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  description: 'text-[var(--text-secondary)]',
  muted: 'text-[var(--text-muted)]',
  error: 'text-[#ff7f7f]',
  controls: 'flex flex-wrap gap-2',
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
  section: [
    'rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]',
    'p-4 sm:p-6',
  ].join(' '),
  sectionTitle: 'text-xl font-semibold',
  itemsGrid: 'gap-3',
  itemCard: 'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3',
  itemImage: 'mb-2 w-full rounded-md object-cover aspect-[2/3]',
};

function CollectionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const mediaId = searchParams.get('mediaId');

  const { data: collection, loading, error } = useCollectionDetailsQuery(id);
  const { data: childData } = useCollectionsQuery({ parentCollectionId: id, page: 1, pageSize: 50 }, Boolean(id));
  const { addItemToCollection, followCollection, unfollowCollection, loading: mutating } = useCollectionMutations();

  const childCollections = Array.isArray(childData?.items) ? childData.items : [];
  const items = Array.isArray(collection?.items) ? collection.items : [];

  const handleAddMedia = async () => {
    if (!mediaId || !id) return;
    await addItemToCollection(id, mediaId);
  };

  const handleFollow = async () => {
    if (!id) return;
    await followCollection(id);
  };

  const handleUnfollow = async () => {
    if (!id) return;
    await unfollowCollection(id);
  };

  if (loading) {
    return (
      <PageLayout>
        <Container>
          <p className={styles.muted}>Loading collection...</p>
        </Container>
      </PageLayout>
    );
  }

  if (error || !collection) {
    return (
      <PageLayout>
        <Container>
          <p className={styles.error}>Collection not found.</p>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <Stack className="gap-2">
            <h1 className={styles.title}>{collection.name}</h1>
            {collection.description ? <p className={styles.description}>{collection.description}</p> : null}
            <p className={styles.muted}>
              {collection.followersCount ?? 0} followers · {items.length} items
            </p>
          </Stack>

          {user ? (
            <div className={styles.controls}>
              <button className={styles.button} type="button" onClick={handleFollow} disabled={mutating}>
                Follow
              </button>
              <button className={styles.button} type="button" onClick={handleUnfollow} disabled={mutating}>
                Unfollow
              </button>
              {mediaId ? (
                <button className={styles.button} type="button" onClick={handleAddMedia} disabled={mutating}>
                  {mutating ? 'Saving...' : 'Add Current Media'}
                </button>
              ) : null}
            </div>
          ) : null}

          <section className={styles.section}>
            <Stack className="gap-4">
              <h2 className={styles.sectionTitle}>Items</h2>
              <Grid variant="cards" className={styles.itemsGrid}>
                {items.map((item) => (
                  <article key={item.mediaId} className={styles.itemCard}>
                    <img className={styles.itemImage} src={buildImageUrl(item.coverUrl)} alt={item.mediaTitle} />
                    <p className="text-sm text-[var(--text-primary)]">{item.mediaTitle}</p>
                  </article>
                ))}
                {items.length === 0 ? <p className={styles.muted}>No media items yet.</p> : null}
              </Grid>
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack className="gap-4">
              <h2 className={styles.sectionTitle}>Nested Collections</h2>
              <CollectionTree collections={childCollections} />
            </Stack>
          </section>
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default CollectionDetailPage;
