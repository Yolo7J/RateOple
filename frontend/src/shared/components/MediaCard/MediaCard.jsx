import { Link } from 'react-router-dom';

const styles = {
  card: [
    'ui-card-interactive group flex h-full flex-col overflow-hidden text-inherit no-underline',
  ].join(' '),
  cover: 'relative aspect-[2/3] w-full overflow-hidden bg-[var(--card-cover-bg)]',
  image: 'h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]',
  typeBadge: [
    'absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold uppercase',
    'bg-[var(--primary-color)] text-[#111]',
  ].join(' '),
  body: 'flex flex-1 flex-col gap-2 p-3',
  title: 'text-sm font-semibold text-[var(--text-primary)]',
  meta: 'flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]',
  rating: 'text-xs font-medium text-[var(--text-secondary)]',
};

const PLACEHOLDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
  <rect width="200" height="300" fill="#22262d"/>
  <text x="100" y="160" font-family="Arial, sans-serif" font-size="16" fill="#8b93a5" text-anchor="middle">
    No Cover
  </text>
</svg>
`;
const PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

const TYPE_LABELS = {
  Movie: 'Film',
  Book: 'Book',
  TvSeries: 'Series',
};

const MediaCard = ({ media }) => {
  const { id, type, title, releaseYear, coverUrl, averageRating, ratingsCount } = media;

  return (
    <article className="h-full">
      <Link className={styles.card} to={`/media/${id}`} aria-label={`Open ${title}`}>
      <div className={styles.cover}>
        <img
          src={coverUrl || PLACEHOLDER}
          alt={title}
          loading="lazy"
          className={styles.image}
          onError={(e) => {
            if (e.currentTarget.src !== PLACEHOLDER) {
              e.currentTarget.src = PLACEHOLDER;
            }
          }}
        />
        <span className={styles.typeBadge}>{TYPE_LABELS[type] ?? type}</span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.meta}>
          {releaseYear ? <span>{releaseYear}</span> : null}
          <span className={styles.rating}>
            ★ {averageRating > 0 ? averageRating.toFixed(1) : '—'}
            {ratingsCount > 0 ? ` (${ratingsCount})` : ''}
          </span>
        </div>
      </div>
      </Link>
    </article>
  );
};

export default MediaCard;
