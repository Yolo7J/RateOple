import { useMemo, useState } from 'react';
import { BookOpen, Film, Star, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { buildImageUrl } from '../../utils/buildImageUrl';

const styles = {
  article: 'media-card-shell h-full min-w-0 [container-type:inline-size]',
  card: [
    'media-card group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)]',
    'border border-[color-mix(in_srgb,var(--border)_86%,transparent)]',
    'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-bg)_96%,transparent),color-mix(in_srgb,var(--bg-secondary)_94%,transparent))]',
    'text-inherit no-underline shadow-[0_18px_42px_-34px_var(--shadow-color)] [transform:translateZ(0)]',
    'transition-[border-color,background-color,box-shadow,transform] duration-[180ms]',
    'hover:-translate-y-[3px] hover:border-[color-mix(in_srgb,var(--primary-color)_42%,var(--border))] hover:bg-[var(--card-hover)] hover:text-inherit hover:shadow-[0_26px_72px_-46px_var(--shadow-color)]',
    'focus-visible:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--primary-color)]',
    'active:translate-y-[-1px] active:scale-[0.995]',
  ].join(' '),
  poster: [
    'media-card__poster relative isolate aspect-[2/3] w-full overflow-hidden',
    'rounded-t-[calc(var(--radius-lg)-1px)] rounded-b-[var(--radius-md)]',
    'bg-[radial-gradient(circle_at_25%_14%,color-mix(in_srgb,var(--primary-color)_15%,transparent),transparent_28%),linear-gradient(145deg,color-mix(in_srgb,var(--card-cover-bg)_88%,#0b0f17),color-mix(in_srgb,var(--bg-primary)_82%,#000))]',
  ].join(' '),
  posterOverlay: [
    'pointer-events-none absolute inset-0 z-[2] opacity-[0.88] transition-opacity duration-[180ms] group-hover:opacity-100',
    'bg-[linear-gradient(180deg,rgba(0,0,0,0.34)_0%,transparent_24%,transparent_62%,rgba(0,0,0,0.52)_100%),radial-gradient(circle_at_50%_104%,rgba(245,197,24,0.14),transparent_36%)]',
  ].join(' '),
  bookSpine: [
    'pointer-events-none absolute inset-y-0 left-0 z-[3] w-[11%] opacity-[0.55]',
    'bg-[linear-gradient(90deg,rgba(0,0,0,0.28),transparent),linear-gradient(180deg,rgba(255,255,255,0.12),transparent_18%,transparent_82%,rgba(0,0,0,0.16))]',
  ].join(' '),
  image: [
    'media-card__image block h-full w-full scale-[1.001] object-cover',
    'transition-[transform,filter] duration-[260ms] group-hover:scale-[1.035] group-hover:saturate-[1.06] group-hover:contrast-[1.03]',
  ].join(' '),
  placeholder: [
    'media-card__placeholder flex h-full w-full flex-col items-center justify-center gap-3 text-center text-[var(--text-secondary)]',
    'border border-[color-mix(in_srgb,var(--primary-color)_16%,transparent)]',
    'bg-[radial-gradient(circle_at_50%_24%,color-mix(in_srgb,var(--primary-color)_18%,transparent),transparent_32%),linear-gradient(155deg,color-mix(in_srgb,var(--bg-elevated)_88%,#0b0f17),color-mix(in_srgb,var(--bg-primary)_88%,#000))]',
  ].join(' '),
  placeholderIcon: 'media-card__placeholder-icon h-[clamp(2rem,28cqw,3.25rem)] w-[clamp(2rem,28cqw,3.25rem)] text-[color-mix(in_srgb,var(--primary-color)_82%,var(--text-secondary))] drop-shadow-[0_16px_24px_rgba(0,0,0,0.34)]',
  placeholderLabel: 'media-card__placeholder-label max-w-[82%] text-[clamp(0.72rem,8cqw,0.82rem)] font-[760] leading-[1.15] text-[var(--text-secondary)]',
  badge: 'media-card__badge absolute left-[0.65rem] top-[0.65rem] z-[4] inline-flex min-h-[1.55rem] max-w-[calc(100%_-_1.3rem)] items-center rounded-full border border-white/40 bg-[linear-gradient(180deg,#ffe27a,var(--primary-color))] px-[0.55rem] py-[0.24rem] text-[clamp(0.64rem,7cqw,0.72rem)] font-[880] uppercase leading-none text-[#111318] shadow-[0_12px_24px_-14px_rgba(0,0,0,0.78)]',
  body: 'media-card__body flex min-w-0 flex-1 flex-col gap-[0.48rem]',
  bodySize: {
    sm: 'min-h-[6.55rem] px-[0.72rem] pb-[0.78rem] pt-[0.7rem]',
    md: 'min-h-[7rem] px-[0.82rem] pb-[0.86rem] pt-[0.78rem]',
    lg: 'min-h-[7.4rem] px-[0.95rem] pb-4 pt-[0.9rem]',
  },
  title: 'media-card__title line-clamp-2 min-h-[2.5em] overflow-hidden text-[clamp(0.88rem,9cqw,0.98rem)] font-[780] leading-tight text-[var(--text-primary)] [overflow-wrap:anywhere]',
  meta: 'media-card__meta flex min-h-5 min-w-0 flex-wrap items-center gap-[0.35rem] text-[clamp(0.72rem,7.6cqw,0.8rem)] font-[650] leading-tight text-[var(--text-muted)]',
  rating: 'media-card__rating mt-auto flex min-h-[1.7rem] min-w-0 items-center gap-[0.35rem] text-[clamp(0.75rem,7.8cqw,0.84rem)] font-[760] leading-none text-[var(--text-secondary)]',
  ratingIcon: 'media-card__rating-icon h-[0.95rem] w-[0.95rem] flex-none text-[var(--primary-color)] drop-shadow-[0_8px_12px_rgba(245,197,24,0.22)]',
  count: 'media-card__count min-w-0 text-[0.74rem] font-[680] text-[var(--text-muted)]',
  status: 'media-card__status inline-flex min-w-0 max-w-full items-center rounded-full bg-[color-mix(in_srgb,var(--primary-color-alpha)_68%,transparent)] px-[0.42rem] py-[0.12rem] text-[0.72rem] font-[780] leading-tight text-[color-mix(in_srgb,var(--primary-color)_72%,var(--text-primary))]',
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
              decoding="async"
              className={styles.image}
              onError={() => setFailedImageUrl(imageUrl)}
            />
          ) : (
            <div className={styles.placeholder} aria-label="No cover available">
              <TypeIcon className={styles.placeholderIcon} aria-hidden="true" strokeWidth={1.8} />
              <span className={styles.placeholderLabel}>No cover</span>
            </div>
          )}
          <span className={styles.posterOverlay} aria-hidden="true" />
          {type === 'Book' ? <span className={styles.bookSpine} aria-hidden="true" /> : null}
          <span className={styles.badge}>{typeLabel}</span>
        </div>
        <div className={clsx(styles.body, styles.bodySize[size] ?? styles.bodySize.md)}>
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
