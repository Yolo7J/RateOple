import { useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import { useCollectionDetailsQuery } from '../queries/useCollectionDetailsQuery';
import { useCollectionsQuery } from '../queries/useCollectionsQuery';
import { useCollectionMutations } from '../queries/useCollectionMutations';
import CollectionTree from '../components/CollectionTree';
import '../components/collections.css';
import './CollectionDetailPage.css';

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

  if (loading) return <main className="ro-page"><p>Loading collection...</p></main>;
  if (error || !collection) return <main className="ro-page"><p className="ro-error">Collection not found.</p></main>;

  return (
    <main className="ro-page">
      <h1>{collection.name}</h1>
      {collection.description ? <p>{collection.description}</p> : null}
      <p className="ro-muted">{collection.followersCount ?? 0} followers · {items.length} items</p>

      {user ? (
        <div className="ro-collection-controls">
          <button type="button" onClick={handleFollow} disabled={mutating}>Follow</button>
          <button type="button" onClick={handleUnfollow} disabled={mutating}>Unfollow</button>
          {mediaId ? (
            <button type="button" onClick={handleAddMedia} disabled={mutating}>
              {mutating ? 'Saving...' : 'Add Current Media'}
            </button>
          ) : null}
        </div>
      ) : null}

      <section className="ro-review-section">
        <h2>Items</h2>
        <div className="ro-collection-items">
          {items.map((item) => (
            <article key={item.mediaId} className="ro-collection-item">
              <img src={buildImageUrl(item.coverUrl)} alt={item.mediaTitle} />
              <p>{item.mediaTitle}</p>
            </article>
          ))}
          {items.length === 0 ? <p className="ro-muted">No media items yet.</p> : null}
        </div>
      </section>

      <section className="ro-review-section">
        <h2>Nested Collections</h2>
        <CollectionTree collections={childCollections} />
      </section>
    </main>
  );
}

export default CollectionDetailPage;
