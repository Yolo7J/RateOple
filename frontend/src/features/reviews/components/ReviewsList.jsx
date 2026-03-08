import ReviewCard from './ReviewCard';
import './reviews.css';

function ReviewsList({ reviews, loading, error }) {
    if (loading) return <p className="ro-review-state">Loading reviews...</p>;
    if (error) return <p className="ro-review-state ro-error">{error}</p>;
    if (!reviews.length) return <p className="ro-review-state">No reviews yet.</p>;

    return (
        <div className="ro-reviews-list">
            {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
            ))}
        </div>
    );
}

export default ReviewsList;
