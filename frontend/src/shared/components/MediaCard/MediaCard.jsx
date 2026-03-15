import { useNavigate } from 'react-router-dom';

const styles = {
  card: [
    'group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl',
    'border border-[var(--border)] bg-[var(--card-bg)] transition',
    'hover:bg-[var(--card-hover)] hover:shadow-[0_10px_30px_-18px_rgba(0,0,0,0.6)]',
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

const PLACEHOLDER = 'https://via.placeholder.com/200x300?text=No+Cover';

const TYPE_LABELS = {
  Movie: 'Film',
  Book: 'Book',
  TvSeries: 'Series',
};

const MediaCard = ({ media }) => {
  const navigate = useNavigate();
  const { id, type, title, releaseYear, coverUrl, averageRating, ratingsCount } = media;

  return (
    <article className={styles.card} onClick={() => navigate(`/media/${id}`)}>
      <div className={styles.cover}>
        <img
          src={coverUrl || PLACEHOLDER}
          alt={title}
          loading="lazy"
          className={styles.image}
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER;
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
    </article>
  );
};

export default MediaCard;
