import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Library, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCollectionsQuery } from '../queries/useCollectionsQuery';
import { useCollectionMutations } from '../queries/useCollectionMutations';
import CollectionCard from '../components/CollectionCard';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Button from '../../../shared/ui/Button';
import EmptyState from '../../../shared/ui/EmptyState';
import FormField from '../../../shared/ui/FormField';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import '../collections.css';

const OWNER_FILTERS = [
  { value: 'all', label: 'All owners' },
  { value: '2', label: 'Personal' },
  { value: '3', label: 'Groups' },
  { value: '1', label: 'RateOple' },
];

const OWNER_LABELS = {
  1: 'RateOple',
  2: 'Personal',
  3: 'Group',
};

const getItemCount = (collection) => (
  Array.isArray(collection?.items)
    ? collection.items.filter((item) => item?.mediaId && item?.mediaTitle).length
    : 0
);

const getHeroArtwork = (collections) => {
  const urls = collections.flatMap((collection) => [
    collection.coverImageUrl,
    ...(Array.isArray(collection.items)
      ? collection.items
        .filter((item) => item?.mediaId && item?.mediaTitle)
        .map((item) => item.coverUrl)
      : []),
  ]);

  return [...new Set(urls.filter(Boolean))].slice(0, 5);
};

function CollectionsSkeleton() {
  return (
    <div className="collections-grid" aria-label="Loading collections">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="collections-skeleton-card" key={index}>
          <div className="ui-skeleton collections-skeleton-card__art" />
          <div className="collections-skeleton-card__body">
            <div className="ui-skeleton collections-skeleton-line short" />
            <div className="ui-skeleton collections-skeleton-line" />
            <div className="ui-skeleton collections-skeleton-line" />
            <div className="ui-skeleton collections-skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CollectionsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const mediaId = searchParams.get('mediaId');
  const createHref = mediaId ? `/collections/new?mediaId=${mediaId}` : '/collections/new';
  const { data, loading, error, refetch } = useCollectionsQuery({ page: 1, pageSize: 36 });
  const {
    followCollection,
    unfollowCollection,
    loading: mutating,
  } = useCollectionMutations();

  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [followStates, setFollowStates] = useState({});
  const [actionError, setActionError] = useState('');

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const heroArtwork = useMemo(() => getHeroArtwork(items), [items]);
  const totalCollections = data?.totalCount ?? items.length;
  const totalSavedItems = useMemo(
    () => items.reduce((sum, collection) => sum + getItemCount(collection), 0),
    [items],
  );
  const totalFollowers = useMemo(
    () => items.reduce((sum, collection) => sum + (collection.followersCount ?? 0), 0),
    [items],
  );
  const canCreateCollection = Boolean(user && !user.isReadOnly);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((collection) => {
      const matchesOwner = ownerFilter === 'all' || String(collection.ownerType) === ownerFilter;
      const searchable = [
        collection.name,
        collection.description,
        OWNER_LABELS[collection.ownerType],
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      return matchesOwner && matchesSearch;
    });
  }, [items, ownerFilter, search]);

  const handleFollow = async (collection) => {
    try {
      setActionError('');
      await followCollection(collection.id);
      setFollowStates((current) => ({ ...current, [collection.id]: true }));
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not follow this collection.');
    }
  };

  const handleUnfollow = async (collection) => {
    try {
      setActionError('');
      await unfollowCollection(collection.id);
      setFollowStates((current) => ({ ...current, [collection.id]: false }));
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not unfollow this collection.');
    }
  };

  return (
    <PageLayout>
      <Container size="xxl">
        <div className="collections-page">
          <section className="collections-hero" aria-labelledby="collections-title">
            <div className="collections-hero__copy">
              <span className="collections-kicker">
                <Library size={15} aria-hidden="true" />
                Saved lists hub
              </span>
              <div>
                <h1 id="collections-title">Collections</h1>
                <p className="collections-hero__subtitle">
                  Curated lists of movies, TV series, and books.
                </p>
              </div>
              <div className="collections-hero__actions">
                {canCreateCollection ? (
                  <Button as={Link} to={createHref} variant="primary" size="lg">
                    Create collection
                  </Button>
                ) : null}
                {user?.isReadOnly ? (
                  <Button type="button" variant="primary" size="lg" disabled title="Confirm your email or resolve the suspension before creating collections.">
                    Create collection
                  </Button>
                ) : null}
                <Button as={Link} to="/media" variant="ghost" size="lg">
                  Browse media
                </Button>
              </div>
              {mediaId && canCreateCollection ? (
                <InlineMessage tone="info">
                  Create a collection and the selected media will be added automatically.
                </InlineMessage>
              ) : null}
              <div className="collections-hero__stats" aria-label="Collections summary">
                <div className="collections-stat">
                  <strong>{totalCollections}</strong>
                  <span>collections</span>
                </div>
                <div className="collections-stat">
                  <strong>{totalSavedItems}</strong>
                  <span>loaded items</span>
                </div>
                <div className="collections-stat">
                  <strong>{totalFollowers}</strong>
                  <span>followers shown</span>
                </div>
              </div>
            </div>
            <div className="collections-hero__shelf" aria-label="Recent collection artwork">
              <div className="collections-shelf-preview">
                {heroArtwork.length > 0 ? heroArtwork.map((url) => (
                  <span className="collections-shelf-preview__poster" key={url}>
                    <img src={buildImageUrl(url, '')} alt="" loading="lazy" />
                  </span>
                )) : (
                  <span className="collections-shelf-preview__empty">
                    <Library size={24} aria-hidden="true" />
                    No covers yet
                  </span>
                )}
              </div>
              <p className="collections-shelf-caption">
                Real artwork appears here as collections fill with saved media.
              </p>
            </div>
          </section>

          <section className="collections-toolbar" aria-labelledby="collections-browse-title">
            <div className="collections-toolbar__header">
              <div>
                <h2 id="collections-browse-title">Browse collections</h2>
                <p>
                  {loading ? 'Loading saved lists...' : `${filteredItems.length} shown from ${items.length} loaded`}
                </p>
              </div>
            </div>
            <div className="collections-toolbar__controls">
              <FormField label="Search collections" id="collections-search">
                {(fieldProps) => (
                  <div className="collections-search-field">
                    <Search aria-hidden="true" />
                    <Input
                      {...fieldProps}
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by title, description, or owner type"
                    />
                  </div>
                )}
              </FormField>
              <FormField label="Owner type" id="collections-owner-filter">
                {(fieldProps) => (
                  <Select
                    {...fieldProps}
                    value={ownerFilter}
                    onChange={(event) => setOwnerFilter(event.target.value)}
                  >
                    {OWNER_FILTERS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                )}
              </FormField>
            </div>
          </section>

          {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}

          {loading ? <CollectionsSkeleton /> : null}

          {error ? (
            <InlineMessage tone="error">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>Failed to load collections.</span>
                <Button type="button" size="sm" onClick={() => refetch()}>
                  <RefreshCw size={15} aria-hidden="true" />
                  Retry
                </Button>
              </div>
            </InlineMessage>
          ) : null}

          {!loading && !error && filteredItems.length > 0 ? (
            <div className="collections-grid">
              {filteredItems.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  canFollow={Boolean(user && !user.isReadOnly)}
                  followState={followStates[collection.id] ?? null}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  followDisabled={mutating}
                />
              ))}
            </div>
          ) : null}

          {!loading && !error && filteredItems.length === 0 ? (
            <EmptyState
              title="No collections found"
              description={
                items.length === 0
                  ? 'Saved lists will appear here as people create public collections.'
                  : 'Try a different search or owner filter.'
              }
              action={(
                <div className="collections-empty-actions">
                  {canCreateCollection ? (
                    <Button as={Link} to={createHref} variant="primary">
                      Create collection
                    </Button>
                  ) : null}
                  <Button as={Link} to="/media" variant="ghost">
                    Browse media
                  </Button>
                </div>
              )}
            />
          ) : null}
        </div>
      </Container>
    </PageLayout>
  );
}

export default CollectionsPage;
