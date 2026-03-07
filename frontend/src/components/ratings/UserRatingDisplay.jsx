import RatingStars from './RatingStars';
import './ratings.css';

function UserRatingDisplay({ averageRating = 0, ratingsCount = 0, userRating = null }) {
    return (
        <section className="ro-rating-summary">
            <div className="summary-main">
                <span className="summary-score">{averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}</span>
                <RatingStars rating={averageRating} />
                <span className="summary-count">{ratingsCount} ratings</span>
            </div>
            <div className="summary-user">
                {userRating ? `Your rating: ${userRating}/10` : 'You have not rated this yet'}
            </div>
        </section>
    );
}

export default UserRatingDisplay;
