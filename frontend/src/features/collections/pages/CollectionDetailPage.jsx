import { useState } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import { useCollectionDetailsQuery } from '../queries/useCollectionDetailsQuery';
import { useCollectionsQuery } from '../queries/useCollectionsQuery';
import { useCollectionMutations } from '../queries/useCollectionMutations';
import { searchMedia } from '../../media/services/mediaLookupService';
import CollectionTree from '../components/CollectionTree';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';
import { EntityPicker } from '../../../shared/ui/EntityPicker';
import Button from '../../../shared/ui/Button';
import Dialog from '../../../shared/ui/Dialog';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import PageHeader from '../../../shared/ui/PageHeader';
import Select from '../../../shared/ui/Select';

const styles = {
  pageStack: 'gap-6',
  titleRow: 'flex flex-wrap items-center gap-2',
  description: 'text-[var(--text-secondary)]',
  muted: 'text-[var(--text-muted)]',
  inputError: 'text-sm text-[#ff7f7f]',
  controls: 'flex flex-wrap gap-2',
  sectionHeader: 'flex flex-wrap items-center justify-between gap-2',
  button: 'ui-button',
  iconButton: 'ui-button px-3 py-1.5 text-xs',
  section: 'ui-card p-4 sm:p-6',
  sectionTitle: 'ui-section-title',
  itemsGrid: 'gap-3',
  itemCard: 'ui-card-interactive cursor-pointer p-3',
  itemImage: 'mb-2 w-full rounded-md object-cover aspect-[2/3]',
  titleInput: 'ui-input text-2xl font-semibold',
  itemActions: 'mt-2 flex flex-wrap gap-2',
  searchForm: 'flex flex-wrap gap-2',
  searchInput: 'ui-input min-w-[220px] flex-1',
};

const SORT_MODES = {
  MANUAL: 1,
  RELEASE_YEAR: 3,
};

function CollectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const mediaId = searchParams.get('mediaId');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [childName, setChildName] = useState('');
  const [childDescription, setChildDescription] = useState('');
  const [childError, setChildError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [sortError, setSortError] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);

  const { data: collection, loading, error } = useCollectionDetailsQuery(id);
  const { data: childData } = useCollectionsQuery({ parentCollectionId: id, page: 1, pageSize: 50 }, Boolean(id));
  const {
    createCollection,
    addItemToCollection,
    removeItemFromCollection,
    reorderCollectionItems,
    updateCollection,
    followCollection,
    unfollowCollection,
    loading: mutating,
  } = useCollectionMutations();
  const childCollections = Array.isArray(childData?.items) ? childData.items : [];
  const items = Array.isArray(collection?.items) ? collection.items : [];
  const canManageCollection = Boolean(user) && (
    (collection?.ownerType === 2 && collection?.ownerId === user?.id) ||
    collection?.ownerType === 3
  );
  const existingMediaIds = new Set(items.map((item) => item.mediaId));
  const [addError, setAddError] = useState('');

  const handleAddMedia = async () => {
    if (!mediaId || !id) return;
    try {
      setAddError('');
      await addItemToCollection(id, mediaId);
    } catch (err) {
      setAddError(err?.response?.data?.message || 'Could not add media to collection.');
    }
  };

  const handleFollow = async () => {
    if (!id) return;
    await followCollection(id);
  };

  const handleUnfollow = async () => {
    if (!id) return;
    await unfollowCollection(id);
  };

  const handleAddSelectedMedia = async (e) => {
    e.preventDefault();
    if (!id || !selectedMedia?.id || existingMediaIds.has(selectedMedia.id)) return;
    try {
      setAddError('');
      await addItemToCollection(id, selectedMedia.id);
      setSelectedMedia(null);
    } catch (err) {
      setAddError(err?.response?.data?.message || `Could not add ${selectedMedia.label} to collection.`);
    }
  };

  const handleCreateChild = async (e) => {
    e.preventDefault();
    if (!childName.trim() || !id) return;
    try {
      setChildError('');
      await createCollection({
        name: childName.trim(),
        description: childDescription.trim() || null,
        parentCollectionId: id,
        ownerType: 2,
      });
      setChildName('');
      setChildDescription('');
    } catch (err) {
      setChildError(err?.response?.data?.message || 'Could not create nested collection.');
    }
  };

  const handleRemoveItem = async () => {
    if (!id) return;
    if (!removeTarget) return;
    try {
      setOrderError('');
      await removeItemFromCollection(id, removeTarget.mediaId);
      setRemoveTarget(null);
    } catch (err) {
      setOrderError(err?.response?.data?.message || 'Could not remove media from collection.');
    }
  };

  const handleMoveItem = async (fromIndex, toIndex) => {
    if (!id || toIndex < 0 || toIndex >= items.length) return;
    const updated = [...items];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    try {
      setOrderError('');
      await reorderCollectionItems(id, updated.map((item) => item.mediaId));
    } catch (err) {
      setOrderError(err?.response?.data?.message || 'Could not reorder items.');
    }
  };

  const handleSortModeChange = async (e) => {
    if (!id) return;
    const nextMode = Number(e.target.value);
    try {
      setSortError('');
      await updateCollection(id, { sortMode: nextMode });
    } catch (err) {
      setSortError(err?.response?.data?.message || 'Could not update sort mode.');
    }
  };

  const handleStartRename = () => {
    setNameDraft(collection?.name ?? '');
    setNameError('');
    setIsEditingName(true);
  };

  const handleCancelRename = () => {
    setIsEditingName(false);
    setNameDraft('');
    setNameError('');
  };

  const handleSaveRename = async () => {
    if (!id) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError('Collection name is required.');
      return;
    }
    if (trimmed.length > 40) {
      setNameError('Collection name must be 40 characters or fewer.');
      return;
    }

    try {
      setNameError('');
      await updateCollection(id, { name: trimmed });
      setIsEditingName(false);
    } catch (err) {
      setNameError(err?.response?.data?.message || 'Could not rename collection.');
    }
  };

  const handleItemNavigate = (mediaIdToOpen) => {
    if (!mediaIdToOpen) return;
    navigate(`/media/${mediaIdToOpen}`);
  };

  if (loading) {
    return (
      <PageLayout>
        <Container>
          <LoadingState label="Loading collection..." />
        </Container>
      </PageLayout>
    );
  }

  if (error || !collection) {
    return (
      <PageLayout>
        <Container>
          <InlineMessage tone="error">Collection not found.</InlineMessage>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <Stack className="gap-2">
            <div className={styles.titleRow}>
              {isEditingName ? (
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    className={styles.titleInput}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={40}
                    aria-label="Collection name"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={styles.button}
                      type="button"
                      onClick={handleSaveRename}
                      disabled={mutating}
                    >
                      {mutating ? 'Saving...' : 'Save'}
                    </button>
                    <button className={styles.button} type="button" onClick={handleCancelRename}>
                      Cancel
                    </button>
                  </div>
                  {nameError ? <p className={styles.inputError}>{nameError}</p> : null}
                </div>
              ) : (
                <>
                  <PageHeader
                    title={collection.name}
                    subtitle={`${collection.followersCount ?? 0} followers · ${items.length} items`}
                  />
                  {canManageCollection ? (
                    <button
                      className={styles.iconButton}
                      type="button"
                      onClick={handleStartRename}
                      aria-label="Rename collection"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M4 13.5V16h2.5L15.6 6.9l-2.5-2.5L4 13.5Z" />
                        <path d="M12.3 4.3 14.8 6.8" />
                      </svg>
                    </button>
                  ) : null}
                </>
              )}
            </div>
            {collection.description ? <p className={styles.description}>{collection.description}</p> : null}
          </Stack>

          {user ? (
            <div className={styles.controls}>
              <Button type="button" onClick={handleFollow} disabled={mutating}>
                Follow
              </Button>
              <Button type="button" onClick={handleUnfollow} disabled={mutating}>
                Unfollow
              </Button>
              {canManageCollection && mediaId ? (
                <Button type="button" onClick={handleAddMedia} disabled={mutating}>
                  {mutating ? 'Saving...' : 'Add Current Media'}
                </Button>
              ) : null}
            </div>
          ) : null}

          {canManageCollection ? (
            <section className={styles.section}>
              <Stack className="gap-4">
                <h2 className={styles.sectionTitle}>Add Media</h2>
                <form className="grid gap-3 max-w-2xl" onSubmit={handleAddSelectedMedia}>
                  <EntityPicker
                    label="Media"
                    placeholder="Search media by title"
                    value={selectedMedia}
                    onChange={setSelectedMedia}
                    searchFn={searchMedia}
                    disabled={mutating}
                  />
                  <button
                    className={styles.button}
                    type="submit"
                    disabled={mutating || !selectedMedia || existingMediaIds.has(selectedMedia.id)}
                  >
                    {selectedMedia && existingMediaIds.has(selectedMedia.id)
                      ? 'Already in Collection'
                      : mutating
                        ? 'Saving...'
                        : `Add ${selectedMedia?.label ?? 'Media'}`}
                  </button>
                </form>
                {addError ? <InlineMessage tone="error">{addError}</InlineMessage> : null}
              </Stack>
            </section>
          ) : null}

          <section className={styles.section}>
            <Stack className="gap-4">
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Items</h2>
                {canManageCollection ? (
                  <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    Sort
                    <Select
                      value={
                        collection.sortMode === SORT_MODES.MANUAL ? SORT_MODES.MANUAL : SORT_MODES.RELEASE_YEAR
                      }
                      onChange={handleSortModeChange}
                      disabled={mutating}
                    >
                      <option value={SORT_MODES.RELEASE_YEAR}>Chronology</option>
                      <option value={SORT_MODES.MANUAL}>Manual</option>
                    </Select>
                  </label>
                ) : null}
              </div>
              <Grid variant="cards" className={styles.itemsGrid}>
                {items.map((item, index) => (
                  <article
                    key={item.mediaId}
                    className={styles.itemCard}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleItemNavigate(item.mediaId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleItemNavigate(item.mediaId);
                      }
                    }}
                  >
                    <img className={styles.itemImage} src={buildImageUrl(item.coverUrl)} alt={item.mediaTitle} />
                    <p className="text-sm text-[var(--text-primary)]">{item.mediaTitle}</p>
                    {canManageCollection ? (
                      <div className={styles.itemActions}>
                        <button
                          className={styles.iconButton}
                          type="button"
                          disabled={mutating || index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveItem(index, index - 1);
                          }}
                        >
                          Move up
                        </button>
                        <button
                          className={styles.iconButton}
                          type="button"
                          disabled={mutating || index === items.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveItem(index, index + 1);
                          }}
                        >
                          Move down
                        </button>
                        <button
                          className={styles.iconButton}
                          type="button"
                          disabled={mutating}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRemoveTarget(item);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
                {items.length === 0 ? <EmptyState title="No media items yet" description="Add media to start building this collection." /> : null}
              </Grid>
              {orderError ? <InlineMessage tone="error">{orderError}</InlineMessage> : null}
              {sortError ? <InlineMessage tone="error">{sortError}</InlineMessage> : null}
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack className="gap-4">
              <h2 className={styles.sectionTitle}>Nested Collections</h2>
              {canManageCollection ? (
                <form className={styles.searchForm} onSubmit={handleCreateChild}>
                  <input
                    className={styles.searchInput}
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="New nested collection name"
                    maxLength={40}
                    required
                  />
                  <input
                    className={styles.searchInput}
                    value={childDescription}
                    onChange={(e) => setChildDescription(e.target.value)}
                    placeholder="Description (optional)"
                  />
                  <button className={styles.button} type="submit" disabled={mutating}>
                    {mutating ? 'Saving...' : 'Add nested collection'}
                  </button>
                </form>
              ) : null}
              {childError ? <InlineMessage tone="error">{childError}</InlineMessage> : null}
              <CollectionTree collections={childCollections} />
            </Stack>
          </section>
          <Dialog
            open={Boolean(removeTarget)}
            title="Remove media from collection?"
            description={`Remove ${removeTarget?.mediaTitle || 'this item'} from ${collection.name}?`}
            onClose={() => setRemoveTarget(null)}
            actions={(
              <>
                <Button variant="ghost" onClick={() => setRemoveTarget(null)}>Cancel</Button>
                <Button variant="danger" onClick={handleRemoveItem} disabled={mutating}>
                  {mutating ? 'Removing...' : 'Remove item'}
                </Button>
              </>
            )}
          />
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default CollectionDetailPage;
