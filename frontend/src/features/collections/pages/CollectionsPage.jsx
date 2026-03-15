import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useCollectionsQuery } from '../queries/useCollectionsQuery';
import { useCollectionMutations } from '../queries/useCollectionMutations';
import CollectionCard from '../components/CollectionCard';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';

const USER_OWNER_TYPE = 2;

const styles = {
  muted: 'text-[var(--text-muted)]',
  error: 'text-[#ff7f7f]',
  pageStack: 'gap-6',
  headerStack: 'gap-2',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  form: [
    'grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]',
    'p-4 sm:p-6 max-w-2xl',
  ].join(' '),
  input: [
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  ].join(' '),
  textarea: [
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  ].join(' '),
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
  grid: 'gap-4',
};

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
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <Stack className={styles.headerStack}>
            <h1 className={styles.title}>Collections</h1>
            {mediaId ? (
              <p className={styles.muted}>
                Create a collection and this media will be added automatically.
              </p>
            ) : null}
          </Stack>

          {user ? (
            <form className={styles.form} onSubmit={handleCreate}>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Collection name"
                maxLength={80}
                required
              />
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
              />
              <button className={styles.button} type="submit" disabled={mutating}>
                {mutating ? 'Saving...' : 'Create collection'}
              </button>
              {actionError ? <p className={styles.error}>{actionError}</p> : null}
            </form>
          ) : null}

          {loading ? <p className={styles.muted}>Loading collections...</p> : null}
          {error ? <p className={styles.error}>Failed to load collections.</p> : null}

          {!loading && !error ? (
            <Grid variant="cards" className={styles.grid}>
              {items.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
              {items.length === 0 ? <p className={styles.muted}>No collections yet.</p> : null}
            </Grid>
          ) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default CollectionsPage;
