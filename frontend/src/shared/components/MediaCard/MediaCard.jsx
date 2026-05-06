import { useMemo, useState } from 'react';
import { BookOpen, Film, Star, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { buildImageUrl } from '../../utils/buildImageUrl';

const styles = {
  article: 'media-card-shell h-full min-w-0',
  card: 'media-card group flex h-full min-w-0 flex-col overflow-hidden text-inherit no-underline',
  poster: 'media-card__poster',
  image: 'media-card__image',
  placeholder: 'media-card__placeholder',
  placeholderIcon: 'media-card__placeholder-icon',
  placeholderLabel: 'media-card__placeholder-label',
  badge: 'media-card__badge',
  body: 'media-card__body',
  title: 'media-card__title',
  meta: 'media-card__meta',
  rating: 'media-card__rating',
  ratingIcon: 'media-card__rating-icon',
  count: 'media-card__count',
  status: 'media-card__status',
};

const TYPE_LABELS = {
  Movie: 'Film',
  Book: 'Book',
  TvSeries: 'Series',
};

const TYPE_ICONS = {
  Movie: Film,
  Book: BookOpen,
  TvSeries: Tv,
};

const STATUS_LABELS = {
  Plan: 'Plan',
  Planning: 'Plan',
  Watching: 'On it',
  Reading: 'On it',
  'On it': 'On it',
  OnIt: 'On it',
  Done: 'Done',
  Completed: 'Done',
  Dropped: 'Dropped',
};

const compactCount = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return '';
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  return String(count);
};

const resolveStatus = (media) => {
  const rawStatus = media?.status ?? media?.userStatus ?? media?.currentStatus;
  if (!rawStatus) return '';
  return STATUS_LABELS[rawStatus] ?? String(rawStatus);
};

const MediaCard = ({ media, variant = 'poster', size = 'md', className }) => {
  const {
    id,
    type,
    title = 'Untitled media',
    releaseYear,
    coverUrl,
    averageRating,
    ratingsCount,
  } = media;
  const imageUrl = useMemo(() => buildImageUrl(coverUrl, ''), [coverUrl]);
  const [failedImageUrl, setFailedImageUrl] = useState('');
  const hasUsableImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;
  const TypeIcon = TYPE_ICONS[type] ?? Film;
  const typeLabel = TYPE_LABELS[type] ?? type ?? 'Media';
  const ratingValue = Number(averageRating);
  const hasRating = Number.isFinite(ratingValue) && ratingValue > 0;
  const ratingCount = compactCount(ratingsCount);
  const status = resolveStatus(media);

  return (
    <article className={clsx(styles.article, className)} data-media-type={type}>
      <Link
        className={styles.card}
        to={`/media/${id}`}
        aria-label={`Open ${title}`}
        data-variant={variant}
        data-size={size}
      >
        <div className={styles.poster}>
          {hasUsableImage ? (
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              className={styles.image}
              onError={() => setFailedImageUrl(imageUrl)}
            />
          ) : (
            <div className={styles.placeholder} aria-label="No cover available">
              <TypeIcon className={styles.placeholderIcon} aria-hidden="true" strokeWidth={1.8} />
              <span className={styles.placeholderLabel}>No cover</span>
            </div>
          )}
          <span className={styles.badge}>{typeLabel}</span>
        </div>
        <div className={styles.body}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.meta}>
            {releaseYear ? <span>{releaseYear}</span> : null}
            {status ? <span className={styles.status}>{status}</span> : null}
          </div>
          <div className={styles.rating}>
            <Star className={styles.ratingIcon} aria-hidden="true" fill="currentColor" strokeWidth={1.8} />
            <span>{hasRating ? ratingValue.toFixed(1) : 'Not rated'}</span>
            {ratingCount ? <span className={styles.count}> ({ratingCount})</span> : null}
          </div>
        </div>
      </Link>
    </article>
  );
};

export default MediaCard;
