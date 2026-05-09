import RatingStars from '../../ratings/components/RatingStars';

const styles = {
  card: 'rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4',
  embedded: 'border-t border-[var(--border)] py-3 first:border-t-0',
  header: 'flex flex-wrap items-center justify-between gap-3',
  meta: 'flex flex-wrap gap-2 text-xs text-[var(--text-muted)]',
  author: 'font-semibold text-[var(--text-primary)]',
  chip: 'inline-flex items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]',
  rating: 'inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]',
  content: 'mt-2 text-sm text-[var(--text-secondary)]',
};

function ReviewCard({ review, showTarget = false, surface = true }) {
    const displayName = review.userDisplayName || `User ${String(review.userId).slice(0, 8)}`;
    const targetLabel = review.targetTitle || review.mediaTitle || review.targetType;

    return (
        <article className={surface ? styles.card : styles.embedded}>
            <header className={styles.header}>
                <div className={styles.meta}>
                    <span className={styles.author}>{displayName}</span>
                    <span>{new Date(review.updatedAt ?? review.createdAt).toLocaleDateString()}</span>
                    {showTarget && targetLabel ? <span className={styles.chip}>{targetLabel}</span> : null}
                </div>
                {typeof review.ratingValue === 'number' && (
                    <div className={styles.rating}>
                        <RatingStars rating={review.ratingValue} />
                        <span>{review.ratingValue}/10</span>
                    </div>
                )}
            </header>
            <p className={styles.content}>{review.content}</p>
        </article>
    );
}

export default ReviewCard;
