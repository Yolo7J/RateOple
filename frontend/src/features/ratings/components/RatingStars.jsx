import './ratings.css';

function RatingStars({ rating = 0 }) {
    const fiveStarValue = Math.max(0, Math.min(5, rating / 2));
    const full = Math.floor(fiveStarValue);
    const half = fiveStarValue - full >= 0.5;

    return (
        <div className="ro-rating-stars" aria-label={`Rating ${rating} out of 10`}>
            {Array.from({ length: 5 }).map((_, index) => {
                const isFull = index < full;
                const isHalf = index === full && half;
                return (
                    <span key={index} className={`star ${isFull ? 'full' : isHalf ? 'half' : 'empty'}`}>
                        ★
                    </span>
                );
            })}
        </div>
    );
}

export default RatingStars;
