import RatingStars from './RatingStars';

const styles = {
  section: [
    'flex flex-wrap justify-between gap-3 rounded-xl border border-[var(--border)]',
    'bg-[var(--card-bg)] p-4',
  ].join(' '),
  main: 'flex items-center gap-2',
  score: 'text-lg font-bold text-[var(--text-primary)]',
  count: 'text-sm text-[var(--text-muted)]',
  user: 'text-sm text-[var(--text-muted)]',
};

function UserRatingDisplay({ averageRating = 0, ratingsCount = 0, userRating = null }) {
    return (
        <section className={styles.section}>
            <div className={styles.main}>
                <span className={styles.score}>{averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}</span>
                <RatingStars rating={averageRating} />
                <span className={styles.count}>{ratingsCount} ratings</span>
            </div>
            <div className={styles.user}>
                {userRating ? `Your rating: ${userRating}/10` : 'You have not rated this yet'}
            </div>
        </section>
    );
}

export default UserRatingDisplay;
