import ReviewCard from './ReviewCard';

const styles = {
  list: 'flex flex-col gap-3',
  state: 'text-sm text-[var(--text-muted)]',
  error: 'text-sm text-[#ff7f7f]',
};

function ReviewsList({ reviews, loading, error, showTarget = false, surface = true, emptyMessage = 'No reviews yet.' }) {
    if (loading) return <p className={styles.state}>Loading reviews...</p>;
    if (error) return <p className={styles.error}>{error}</p>;
    if (!reviews.length) return <p className={styles.state}>{emptyMessage}</p>;

    return (
        <div className={styles.list}>
            {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} showTarget={showTarget} surface={surface} />
            ))}
        </div>
    );
}

export default ReviewsList;
