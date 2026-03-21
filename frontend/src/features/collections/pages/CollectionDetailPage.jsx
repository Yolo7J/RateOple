import { useState } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import { useCollectionDetailsQuery } from '../queries/useCollectionDetailsQuery';
import { useCollectionsQuery } from '../queries/useCollectionsQuery';
import { useCollectionMutations } from '../queries/useCollectionMutations';
import { useMediaListQuery } from '../../media/queries/useMediaListQuery';
import { MEDIA_TYPES } from '../../../shared/constants/mediaTypes';
import CollectionTree from '../components/CollectionTree';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';

const styles = {
  pageStack: 'gap-6',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  titleRow: 'flex flex-wrap items-center gap-2',
  description: 'text-[var(--text-secondary)]',
  muted: 'text-[var(--text-muted)]',
  error: 'text-[#ff7f7f]',
  inputError: 'text-sm text-[#ff7f7f]',
  controls: 'flex flex-wrap gap-2',
  sectionHeader: 'flex flex-wrap items-center justify-between gap-2',
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
  iconButton: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
  select: [
    'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-sm text-[var(--text-primary)]',
  ].join(' '),
  section: [
    'rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]',
    'p-4 sm:p-6',
  ].join(' '),
  sectionTitle: 'text-xl font-semibold',
  itemsGrid: 'gap-3',
  itemCard: 'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3 transition hover:border-[var(--text-muted)] cursor-pointer',
  itemImage: 'mb-2 w-full rounded-md object-cover aspect-[2/3]',
  titleInput: [
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-2xl font-semibold text-[var(--text-primary)]',
  ].join(' '),
  itemActions: 'mt-2 flex flex-wrap gap-2',
  searchForm: 'flex flex-wrap gap-2',
  searchInput: [
    'flex-1 min-w-[220px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  ].join(' '),
  searchResults: 'gap-3',
  searchCard: 'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3',
  searchTitle: 'text-sm font-semibold text-[var(--text-primary)]',
  searchMeta: 'text-xs text-[var(--text-muted)]',
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
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [childName, setChildName] = useState('');
  const [childDescription, setChildDescription] = useState('');
  const [childError, setChildError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [sortError, setSortError] = useState('');

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
  const {
    data: searchResult,
    loading: searchLoading,
    error: searchError,
  } = useMediaListQuery({
    types: MEDIA_TYPES,
    genreIds: [],
    search: searchTerm,
    sortBy: 'title',
    sortDir: 'asc',
    page: 1,
    pageSize: 8,
    enabled: Boolean(searchTerm.trim()),
  });

  const childCollections = Array.isArray(childData?.items) ? childData.items : [];
  const items = Array.isArray(collection?.items) ? collection.items : [];
  const canManageCollection = Boolean(user) && (
    (collection?.ownerType === 2 && collection?.ownerId === user?.id) ||
    collection?.ownerType === 3
  );
  const existingMediaIds = new Set(items.map((item) => item.mediaId));
  const searchItems = Array.isArray(searchResult?.items) ? searchResult.items : [];
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
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

  const handleRemoveItem = async (mediaIdToRemove) => {
    if (!id) return;
    try {
      setOrderError('');
      await removeItemFromCollection(id, mediaIdToRemove);
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
                  <h1 className={styles.title}>{collection.name}</h1>
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
              {canManageCollection && mediaId ? (
                <button className={styles.button} type="button" onClick={handleAddMedia} disabled={mutating}>
                  {mutating ? 'Saving...' : 'Add Current Media'}
                </button>
              ) : null}
            </div>
          ) : null}

          {canManageCollection ? (
            <section className={styles.section}>
              <Stack className="gap-4">
                <h2 className={styles.sectionTitle}>Add Media</h2>
                <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
                  <input
                    className={styles.searchInput}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by title..."
                  />
                  <button className={styles.button} type="submit" disabled={mutating}>
                    Search
                  </button>
                </form>
                {searchTerm ? (
                  <>
                    {searchLoading ? <p className={styles.muted}>Searching media...</p> : null}
                    {searchError ? <p className={styles.error}>Failed to search media.</p> : null}
                    {!searchLoading && !searchError ? (
                      <Grid variant="cards" className={styles.searchResults}>
                        {searchItems.map((media) => {
                          const alreadyAdded = existingMediaIds.has(media.id);
                          return (
                            <article key={media.id} className={styles.searchCard}>
                              <img
                                className={styles.itemImage}
                                src={buildImageUrl(media.coverUrl)}
                                alt={media.title}
                              />
                              <p className={styles.searchTitle}>{media.title}</p>
                              <p className={styles.searchMeta}>
                                {media.type} · {media.releaseYear ?? 'N/A'}
                              </p>
                              <button
                                className={styles.button}
                                type="button"
                                disabled={alreadyAdded || mutating}
                                onClick={async () => {
                                  try {
                                    setAddError('');
                                    await addItemToCollection(id, media.id);
                                  } catch (err) {
                                    setAddError(err?.response?.data?.message || 'Could not add media to collection.');
                                  }
                                }}
                              >
                                {alreadyAdded ? 'Already in Collection' : mutating ? 'Saving...' : 'Add Media'}
                              </button>
                            </article>
                          );
                        })}
                        {searchItems.length === 0 ? (
                          <p className={styles.muted}>No media found.</p>
                        ) : null}
                      </Grid>
                    ) : null}
                  </>
                ) : (
                  <p className={styles.muted}>Search for a title to add it to your collection.</p>
                )}
                {addError ? <p className={styles.error}>{addError}</p> : null}
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
                    <select
                      className={styles.select}
                      value={
                        collection.sortMode === SORT_MODES.MANUAL ? SORT_MODES.MANUAL : SORT_MODES.RELEASE_YEAR
                      }
                      onChange={handleSortModeChange}
                      disabled={mutating}
                    >
                      <option value={SORT_MODES.RELEASE_YEAR}>Chronology</option>
                      <option value={SORT_MODES.MANUAL}>Manual</option>
                    </select>
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
                            handleRemoveItem(item.mediaId);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
                {items.length === 0 ? <p className={styles.muted}>No media items yet.</p> : null}
              </Grid>
              {orderError ? <p className={styles.error}>{orderError}</p> : null}
              {sortError ? <p className={styles.error}>{sortError}</p> : null}
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
              {childError ? <p className={styles.error}>{childError}</p> : null}
              <CollectionTree collections={childCollections} />
            </Stack>
          </section>
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default CollectionDetailPage;
