import RatingStars from '../../ratings/components/RatingStars';

const styles = {
  card: 'rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4',
  header: 'flex flex-wrap items-center justify-between gap-3',
  meta: 'flex flex-wrap gap-2 text-xs text-[var(--text-muted)]',
  author: 'font-semibold text-[var(--text-primary)]',
  rating: 'inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]',
  content: 'mt-2 text-sm text-[var(--text-secondary)]',
};

function ReviewCard({ review }) {
    return (
        <article className={styles.card}>
            <header className={styles.header}>
                <div className={styles.meta}>
                    <span className={styles.author}>User {String(review.userId).slice(0, 8)}</span>
                    <span>{new Date(review.updatedAt ?? review.createdAt).toLocaleDateString()}</span>
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
