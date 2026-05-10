import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Library, ListChecks, UserRound, UsersRound } from 'lucide-react';
import Button from '../../../shared/ui/Button';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import '../collections.css';

const OWNER_LABELS = {
  1: 'RateOple',
  2: 'Personal',
  3: 'Group',
};

const getItemCount = (collection) => {
  if (typeof collection?.itemsCount === 'number') return collection.itemsCount;
  return Array.isArray(collection?.items) ? collection.items.length : 0;
};

const getArtwork = (collection, limit = 4) => {
  const urls = [
    collection?.coverImageUrl,
    ...(Array.isArray(collection?.items) ? collection.items.map((item) => item.coverUrl) : []),
  ];

  return [...new Set(urls.filter(Boolean))].slice(0, limit);
};

const pluralize = (count, singular) => `${count} ${singular}${count === 1 ? '' : 's'}`;

function CollectionArtwork({ collection, compact = false }) {
  const artwork = getArtwork(collection, compact ? 4 : 4);

  return (
    <div className="collection-card__montage" aria-hidden="true">
      {artwork.length > 0 ? artwork.map((url) => (
        <span className="collection-card__poster" key={url}>
          <img src={buildImageUrl(url, '')} alt="" loading="lazy" />
        </span>
      )) : (
        <span className="collection-card__placeholder">
          <Library size={22} aria-hidden="true" />
          <span>No cover yet</span>
        </span>
      )}
    </div>
  );
}

export default function CollectionCard({
  collection,
  variant = 'grid',
  className,
  canFollow = false,
  followState = null,
  onFollow,
  onUnfollow,
  followDisabled = false,
}) {
  const itemCount = getItemCount(collection);
  const followersCount = collection?.followersCount ?? 0;
  const ownerLabel = OWNER_LABELS[collection?.ownerType] ?? 'Collection';
  const isFollowing = followState === true;
  const canToggleFollow = canFollow && (onFollow || onUnfollow);
  const followLabel = isFollowing ? 'Following' : 'Follow';
  const followAriaLabel = isFollowing
    ? `Unfollow ${collection.name}`
    : `Follow ${collection.name}`;

  const handleFollow = () => {
    if (followDisabled) return;
    if (isFollowing && onUnfollow) {
      onUnfollow(collection);
      return;
    }
    onFollow?.(collection);
  };

  return (
    <article className={clsx('collection-card', `collection-card--${variant}`, className)}>
      <Link
        to={`/collections/${collection.id}`}
        className="collection-card__art"
        aria-label={`Open ${collection.name}`}
      >
        <CollectionArtwork collection={collection} compact={variant === 'compact'} />
      </Link>
      <div className="collection-card__body">
        <div className="collection-card__eyebrow">
          <span className="collection-pill">
            <UserRound aria-hidden="true" />
            {ownerLabel}
          </span>
        </div>
        <div>
          <h3 className="collection-card__title">
            <Link to={`/collections/${collection.id}`}>{collection.name}</Link>
          </h3>
          {collection.description ? (
            <p className="collection-card__description">{collection.description}</p>
          ) : (
            <p className="collection-card__description">No description yet.</p>
          )}
        </div>
        <div className="collection-card__stats">
          <span>
            <ListChecks aria-hidden="true" />
            {pluralize(itemCount, 'item')}
          </span>
          <span>
            <UsersRound aria-hidden="true" />
            {pluralize(followersCount, 'follower')}
          </span>
        </div>
        <div className="collection-card__actions">
          <Button as={Link} to={`/collections/${collection.id}`} variant="primary" size="sm">
            Open
          </Button>
          {canToggleFollow ? (
            <Button
              type="button"
              variant={isFollowing ? 'ghost' : 'default'}
              size="sm"
              onClick={handleFollow}
              disabled={followDisabled}
              aria-label={followAriaLabel}
            >
              {followLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
