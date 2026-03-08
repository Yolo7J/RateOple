import RatingStars from '../../ratings/components/RatingStars';
import './reviews.css';

function ReviewCard({ review }) {
    return (
        <article className="ro-review-card">
            <header>
                <div className="ro-review-meta">
                    <span className="ro-review-author">User {String(review.userId).slice(0, 8)}</span>
                    <span>{new Date(review.updatedAt ?? review.createdAt).toLocaleDateString()}</span>
                </div>
                {typeof review.ratingValue === 'number' && (
                    <div className="ro-review-rating">
                        <RatingStars rating={review.ratingValue} />
                        <span>{review.ratingValue}/10</span>
                    </div>
                )}
            </header>
            <p>{review.content}</p>
        </article>
    );
}

export default ReviewCard;
