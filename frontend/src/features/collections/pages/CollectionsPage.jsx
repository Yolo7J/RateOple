import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useCollectionsQuery } from '../queries/useCollectionsQuery';
import { useCollectionMutations } from '../queries/useCollectionMutations';
import CollectionCard from '../components/CollectionCard';
import '../components/collections.css';
import '../../../pages/pages.css';

const USER_OWNER_TYPE = 2;

function CollectionsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const mediaId = searchParams.get('mediaId');
  const { data, loading, error } = useCollectionsQuery({ page: 1, pageSize: 36 });
  const { createCollection, addItemToCollection, loading: mutating } = useCollectionMutations();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [actionError, setActionError] = useState('');

  const items = Array.isArray(data?.items) ? data.items : [];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setActionError('');

    try {
      const created = await createCollection({
        name: name.trim(),
        description: description.trim() || null,
        ownerType: USER_OWNER_TYPE,
      });

      if (mediaId) {
        await addItemToCollection(created.id, mediaId);
      }

      setName('');
      setDescription('');
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not create collection.');
    }
  };

  return (
    <main className="ro-page">
      <h1>Collections</h1>
      {mediaId ? <p className="ro-muted">Create a collection and this media will be added automatically.</p> : null}

      {user ? (
        <form className="ro-collection-create" onSubmit={handleCreate}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Collection name"
            maxLength={80}
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
          />
          <button type="submit" disabled={mutating}>{mutating ? 'Saving...' : 'Create collection'}</button>
          {actionError ? <p className="ro-error">{actionError}</p> : null}
        </form>
      ) : null}

      {loading ? <p>Loading collections...</p> : null}
      {error ? <p className="ro-error">Failed to load collections.</p> : null}

      {!loading && !error ? (
        <section className="ro-collections-grid">
          {items.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
          {items.length === 0 ? <p className="ro-muted">No collections yet.</p> : null}
        </section>
      ) : null}
    </main>
  );
}

export default CollectionsPage;
