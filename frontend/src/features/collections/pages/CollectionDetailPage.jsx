import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Library,
  PencilLine,
  RefreshCw,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import { useCollectionDetailsQuery } from '../queries/useCollectionDetailsQuery';
import { useCollectionsQuery } from '../queries/useCollectionsQuery';
import { useCollectionMutations } from '../queries/useCollectionMutations';
import { useMediaDetailsQuery } from '../../media/queries/useMediaDetailsQuery';
import { searchMedia } from '../../media/services/mediaLookupService';
import CollectionCard from '../components/CollectionCard';
import MediaCard from '../../../shared/components/MediaCard/MediaCard';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import { EntityPicker } from '../../../shared/ui/EntityPicker';
import Button from '../../../shared/ui/Button';
import Dialog from '../../../shared/ui/Dialog';
import EmptyState from '../../../shared/ui/EmptyState';
import FormField from '../../../shared/ui/FormField';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import '../collections.css';

const SORT_OPTIONS = [
  { value: 3, label: 'Release chronology' },
  { value: 1, label: 'Manual order' },
  { value: 5, label: 'Alphabetical' },
  { value: 2, label: 'Highest rated' },
  { value: 4, label: 'Duration' },
];

const OWNER_LABELS = {
  1: 'RateOple',
  2: 'Personal',
  3: 'Group',
};

const sameId = (left, right) => (
  Boolean(left && right) && String(left).toLowerCase() === String(right).toLowerCase()
);

const canManage = (collection, user) => Boolean(user) && (
  (collection?.ownerType === 2 && sameId(collection?.ownerId, user?.id)) ||
  collection?.ownerType === 3
);

const getArtwork = (collection) => {
  const urls = [
    collection?.coverImageUrl,
    ...(Array.isArray(collection?.items)
      ? collection.items
        .filter((item) => item?.mediaId && item?.mediaTitle)
        .map((item) => item.coverUrl)
      : []),
  ];

  return [...new Set(urls.filter(Boolean))].slice(0, 5);
};

const isValidCollectionItem = (item) => Boolean(item?.mediaId && item?.mediaTitle);

const toMediaCardItem = (item) => ({
  id: item.mediaId,
  title: item.mediaTitle,
  coverUrl: item.coverUrl,
});

const pluralize = (count, singular) => `${count} ${singular}${count === 1 ? '' : 's'}`;

function DetailSkeleton() {
  return (
    <div className="collection-detail-page">
      <div className="collections-skeleton-card">
        <div className="ui-skeleton collections-skeleton-card__art" />
        <div className="collections-skeleton-card__body">
          <div className="ui-skeleton collections-skeleton-line short" />
          <div className="ui-skeleton collections-skeleton-line" />
          <div className="ui-skeleton collections-skeleton-line" />
          <div className="ui-skeleton collections-skeleton-line short" />
        </div>
      </div>
    </div>
  );
}

function CollectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const mediaId = searchParams.get('mediaId');
  const { data: currentMedia, loading: currentMediaLoading } = useMediaDetailsQuery(mediaId);
  const { data: collection, loading, error, refetch } = useCollectionDetailsQuery(id);
  const { data: childData } = useCollectionsQuery({ parentCollectionId: id, page: 1, pageSize: 50 }, Boolean(id));
  const {
    createCollection,
    addItemToCollection,
    removeItemFromCollection,
    reorderCollectionItems,
    updateCollection,
    followCollection,
    unfollowCollection,
    deleteCollection,
    loading: mutating,
  } = useCollectionMutations();

  const [selectedMedia, setSelectedMedia] = useState(null);
  const [childName, setChildName] = useState('');
  const [childDescription, setChildDescription] = useState('');
  const [childError, setChildError] = useState('');
  const [addError, setAddError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [sortError, setSortError] = useState('');
  const [followError, setFollowError] = useState('');
  const [followState, setFollowState] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const childCollections = useMemo(
    () => (Array.isArray(childData?.items) ? childData.items : []),
    [childData],
  );
  const items = useMemo(
    () => (Array.isArray(collection?.items) ? collection.items : []),
    [collection],
  );
  const userCanManage = canManage(collection, user);
  const existingMediaIds = useMemo(
    () => new Set(items.map((item) => String(item.mediaId).toLowerCase())),
    [items],
  );
  const isExistingMedia = (mediaIdToCheck) => (
    Boolean(mediaIdToCheck) && existingMediaIds.has(String(mediaIdToCheck).toLowerCase())
  );
  const currentMediaAlreadyAdded = isExistingMedia(mediaId);
  const artwork = useMemo(() => getArtwork(collection), [collection]);
  const ownerLabel = OWNER_LABELS[collection?.ownerType] ?? 'Collection';
  const sortLabel = SORT_OPTIONS.find((option) => option.value === collection?.sortMode)?.label ?? 'Custom order';

  const handleAddMedia = async () => {
    if (!mediaId || !id || currentMediaAlreadyAdded) return;
    try {
      setAddError('');
      await addItemToCollection(id, mediaId);
    } catch (err) {
      setAddError(err?.response?.data?.message || 'Could not add media to collection.');
    }
  };

  const handleFollowToggle = async () => {
    if (!id || !user) return;
    try {
      setFollowError('');
      if (followState === true) {
        await unfollowCollection(id);
        setFollowState(false);
        return;
      }
      await followCollection(id);
      setFollowState(true);
    } catch (err) {
      setFollowError(err?.response?.data?.message || 'Could not update follow state.');
    }
  };

  const handleAddSelectedMedia = async (event) => {
    event.preventDefault();
    if (!id || !selectedMedia?.id || isExistingMedia(selectedMedia.id)) return;
    try {
      setAddError('');
      await addItemToCollection(id, selectedMedia.id);
      setSelectedMedia(null);
    } catch (err) {
      setAddError(err?.response?.data?.message || `Could not add ${selectedMedia.label} to collection.`);
    }
  };

  const handleCreateChild = async (event) => {
    event.preventDefault();
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
    if (!id || !removeTarget) return;
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

  const handleSortModeChange = async (event) => {
    if (!id) return;
    const nextMode = Number(event.target.value);
    try {
      setSortError('');
      await updateCollection(id, { sortMode: nextMode });
    } catch (err) {
      setSortError(err?.response?.data?.message || 'Could not update sort mode.');
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteError('');
      await deleteCollection(id);
      navigate('/collections');
    } catch (err) {
      setDeleteOpen(false);
      setDeleteError(err?.response?.data?.message || 'Could not delete collection.');
    }
  };

  const handleScrollToAddMedia = () => {
    document.getElementById('collection-add-media-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <PageLayout>
        <Container size="xxl">
          <DetailSkeleton />
        </Container>
      </PageLayout>
    );
  }

  if (error || !collection) {
    return (
      <PageLayout>
        <Container size="lg">
          <div className="collection-detail-page">
            <InlineMessage tone="error">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>Collection not found.</span>
                <Button type="button" size="sm" onClick={() => refetch()}>
                  <RefreshCw size={15} aria-hidden="true" />
                  Retry
                </Button>
              </div>
            </InlineMessage>
          </div>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container size="xxl">
        <div className="collection-detail-page">
          <section className="collection-detail-hero" aria-labelledby="collection-detail-title">
            <div className="collection-detail-hero__shelf" aria-label="Collection artwork">
              <div className="collection-detail-shelf-preview">
                {artwork.length > 0 ? artwork.map((url) => (
                  <span className="collection-detail-shelf-preview__poster" key={url}>
                    <img src={buildImageUrl(url, '')} alt="" loading="lazy" />
                  </span>
                )) : (
                  <span className="collection-detail-shelf-preview__empty">
                    <Library size={24} aria-hidden="true" />
                    No covers yet
                  </span>
                )}
              </div>
            </div>

            <div className="collection-detail-hero__copy">
              <Button as={Link} to="/collections" variant="ghost" size="sm">
                <ArrowLeft size={15} aria-hidden="true" />
                Collections
              </Button>
              <div className="collection-detail-meta">
                <span className="collection-pill">
                  <UserRound aria-hidden="true" />
                  {ownerLabel}
                </span>
                <span className="collection-pill">{sortLabel}</span>
              </div>
              <div>
                <h1 id="collection-detail-title">{collection.name}</h1>
                {collection.description ? (
                  <p className="collection-detail-hero__description">{collection.description}</p>
                ) : (
                  <p className="collection-detail-hero__description">No description yet.</p>
                )}
              </div>
              <div className="collection-detail-stats" aria-label="Collection stats">
                <div className="collection-detail-stat">
                  <strong>{items.length}</strong>
                  <span>items</span>
                </div>
                <div className="collection-detail-stat">
                  <strong>{collection.followersCount ?? 0}</strong>
                  <span>followers</span>
                </div>
                <div className="collection-detail-stat">
                  <strong>{childCollections.length}</strong>
                  <span>nested lists</span>
                </div>
              </div>
              <div className="collection-detail-hero__actions">
                {user ? (
                  <Button
                    type="button"
                    variant={followState === true ? 'ghost' : 'primary'}
                    onClick={handleFollowToggle}
                    disabled={mutating}
                    aria-label={followState === true ? `Unfollow ${collection.name}` : `Follow ${collection.name}`}
                  >
                    <UsersRound size={15} aria-hidden="true" />
                    {followState === true ? 'Following' : 'Follow'}
                  </Button>
                ) : null}
                <Button as={Link} to="/media" variant="ghost">
                  Browse media
                </Button>
                {userCanManage ? (
                  <>
                    <Button as={Link} to={`/collections/${id}/edit`} variant="ghost">
                      <PencilLine size={15} aria-hidden="true" />
                      Edit
                    </Button>
                    <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)} disabled={mutating}>
                      <Trash2 size={15} aria-hidden="true" />
                      Delete
                    </Button>
                  </>
                ) : null}
              </div>
              {followError ? <InlineMessage tone="error">{followError}</InlineMessage> : null}
              {deleteError ? <InlineMessage tone="error">{deleteError}</InlineMessage> : null}
            </div>
          </section>

          {userCanManage ? (
            <section className="collection-add-panel" id="collection-add-media-panel" aria-labelledby="collection-add-media-title">
              <div className="collection-add-panel__header">
                <div>
                  <h2 id="collection-add-media-title">Add media</h2>
                  <p>Search for a title, then add it to this saved list.</p>
                </div>
              </div>

              {mediaId ? (
                <div className="collection-current-media">
                  <span className="collection-current-media__cover">
                    {currentMedia?.coverUrl ? (
                      <img src={buildImageUrl(currentMedia.coverUrl, '')} alt="" loading="lazy" />
                    ) : (
                      <Library size={20} aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <strong>
                      {currentMediaLoading ? 'Loading selected media...' : currentMedia?.title || 'Selected media'}
                    </strong>
                    <span>
                      {currentMediaAlreadyAdded
                        ? 'This media is already saved in the collection.'
                        : 'Add the media carried from the previous page.'}
                    </span>
                  </div>
                  <Button type="button" onClick={handleAddMedia} disabled={mutating || currentMediaAlreadyAdded}>
                    {currentMediaAlreadyAdded ? 'Already added' : mutating ? 'Saving...' : 'Add current media'}
                  </Button>
                </div>
              ) : null}

              <form className="collection-add-form" onSubmit={handleAddSelectedMedia}>
                <EntityPicker
                  label="Media"
                  placeholder="Search movies, TV series, or books"
                  value={selectedMedia}
                  onChange={setSelectedMedia}
                  searchFn={searchMedia}
                  disabled={mutating}
                  minSearchLength={1}
                />
                <Button
                  type="submit"
                  disabled={mutating || !selectedMedia || isExistingMedia(selectedMedia.id)}
                >
                  {selectedMedia && isExistingMedia(selectedMedia.id)
                    ? 'Already saved'
                    : mutating
                      ? 'Saving...'
                      : `Add ${selectedMedia?.label ?? 'media'}`}
                </Button>
              </form>
              {addError ? <InlineMessage tone="error">{addError}</InlineMessage> : null}
            </section>
          ) : null}

          <section className="collection-section" aria-labelledby="collection-items-title">
            <div className="collection-section__header">
              <div>
                <h2 id="collection-items-title">Media in this collection</h2>
                <p>{pluralize(items.length, 'saved title')}</p>
              </div>
              {userCanManage ? (
                <FormField label="Sort items" id="collection-sort-mode">
                  {(fieldProps) => (
                    <Select
                      {...fieldProps}
                      value={collection.sortMode ?? 3}
                      onChange={handleSortModeChange}
                      disabled={mutating}
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  )}
                </FormField>
              ) : null}
            </div>

            {items.length > 0 ? (
              <div className="collection-items-grid">
                {items.map((item, index) => (
                  <article className="collection-item-card" key={item.mediaId || `removed-${index}`}>
                    {isValidCollectionItem(item) ? (
                      <MediaCard media={toMediaCardItem(item)} size="sm" />
                    ) : (
                      <div className="collection-removed-media" aria-disabled="true">
                        <Library size={22} aria-hidden="true" />
                        <strong>Removed media</strong>
                        <span>This title is no longer available in the public catalog.</span>
                      </div>
                    )}
                    {userCanManage ? (
                      <div className="collection-item-actions">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={mutating || index === 0 || !isValidCollectionItem(item)}
                          onClick={() => handleMoveItem(index, index - 1)}
                          aria-label={`Move ${item.mediaTitle || 'removed media'} up`}
                        >
                          <ArrowUp size={14} aria-hidden="true" />
                          Up
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={mutating || index === items.length - 1 || !isValidCollectionItem(item)}
                          onClick={() => handleMoveItem(index, index + 1)}
                          aria-label={`Move ${item.mediaTitle || 'removed media'} down`}
                        >
                          <ArrowDown size={14} aria-hidden="true" />
                          Down
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={mutating}
                          onClick={() => setRemoveTarget(item)}
                          aria-label={`Remove ${item.mediaTitle || 'removed media'}`}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No media in this collection yet."
                description={userCanManage ? 'Use the add media search to start building the list.' : 'Saved titles will appear here when the owner adds them.'}
                action={userCanManage ? (
                  <Button type="button" variant="primary" onClick={handleScrollToAddMedia}>
                    Add media
                  </Button>
                ) : null}
              />
            )}

            {orderError ? <InlineMessage tone="error">{orderError}</InlineMessage> : null}
            {sortError ? <InlineMessage tone="error">{sortError}</InlineMessage> : null}
          </section>

          <section className="collection-section" aria-labelledby="collection-nested-title">
            <div className="collection-section__header">
              <div>
                <h2 id="collection-nested-title">Nested collections</h2>
                <p>Related shelves inside this saved list.</p>
              </div>
            </div>

            {userCanManage ? (
              <form className="collection-child-form" onSubmit={handleCreateChild}>
                <FormField label="Nested title" id="child-collection-name">
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      value={childName}
                      onChange={(event) => setChildName(event.target.value)}
                      placeholder="Awards season"
                      maxLength={40}
                      required
                    />
                  )}
                </FormField>
                <FormField label="Description" id="child-collection-description">
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      value={childDescription}
                      onChange={(event) => setChildDescription(event.target.value)}
                      placeholder="Optional context"
                      maxLength={1000}
                    />
                  )}
                </FormField>
                <Button type="submit" disabled={mutating}>
                  {mutating ? 'Saving...' : 'Add nested collection'}
                </Button>
              </form>
            ) : null}

            {childError ? <InlineMessage tone="error">{childError}</InlineMessage> : null}

            {childCollections.length > 0 ? (
              <div className="collections-detail-grid">
                {childCollections.map((childCollection) => (
                  <CollectionCard key={childCollection.id} collection={childCollection} variant="compact" />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No nested collections yet."
                description={userCanManage ? 'Create a nested collection when this shelf needs a smaller shelf inside it.' : 'Nested collections will appear here when available.'}
              />
            )}
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

          <Dialog
            open={deleteOpen}
            title="Delete collection?"
            description={`Delete ${collection.name}? This removes the collection, not the media titles.`}
            onClose={() => setDeleteOpen(false)}
            actions={(
              <>
                <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete} disabled={mutating}>
                  {mutating ? 'Deleting...' : 'Delete collection'}
                </Button>
              </>
            )}
          />
        </div>
      </Container>
    </PageLayout>
  );
}

export default CollectionDetailPage;
