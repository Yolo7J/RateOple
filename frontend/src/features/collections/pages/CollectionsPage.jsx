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
import Button from '../../../shared/ui/Button';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import LoadingState from '../../../shared/ui/LoadingState';
import PageHeader from '../../../shared/ui/PageHeader';
import Textarea from '../../../shared/ui/Textarea';

const USER_OWNER_TYPE = 2;

const styles = {
  muted: 'text-[var(--text-muted)]',
  pageStack: 'gap-6',
  headerStack: 'gap-2',
  form: 'ui-card grid max-w-2xl gap-3 p-4 sm:p-6',
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
            <PageHeader title="Collections" />
            {mediaId ? (
              <p className={styles.muted}>
                Create a collection and this media will be added automatically.
              </p>
            ) : null}
          </Stack>

          {user ? (
            <form className={styles.form} onSubmit={handleCreate}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Collection name"
                maxLength={40}
                required
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
              />
              <Button type="submit" variant="primary" disabled={mutating}>
                {mutating ? 'Saving...' : 'Create collection'}
              </Button>
              {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}
            </form>
          ) : null}

          {loading ? <LoadingState label="Loading collections..." /> : null}
          {error ? <InlineMessage tone="error">Failed to load collections.</InlineMessage> : null}

          {!loading && !error ? (
            <Grid variant="cards" className={styles.grid}>
              {items.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
              {items.length === 0 ? <EmptyState title="No collections yet" /> : null}
            </Grid>
          ) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default CollectionsPage;
