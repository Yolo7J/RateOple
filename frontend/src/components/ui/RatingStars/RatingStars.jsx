import React, { useState } from 'react';
import './RatingStars.css';

const RatingStars = ({
    initialRating = 0,
    onRate,
    readOnly = false,
    size = 'medium'
}) => {
    const [hoverValue, setHoverValue] = useState(0);
    const [rating, setRating] = useState(initialRating);

    // Update local state when prop changes
    React.useEffect(() => {
        setRating(initialRating);
    }, [initialRating]);

    // Handle star click
    const handleClick = (value) => {
        if (readOnly) return;
        setRating(value);
        if (onRate) onRate(value);
    };

    // Render 10 stars since our scale is 1-10
    const renderStars = () => {
        const stars = [];
        for (let i = 1; i <= 10; i++) {
            const isFilled = i <= (hoverValue || rating);
            stars.push(
                <span
                    key={i}
                    className={`star ${isFilled ? 'filled' : ''} ${readOnly ? 'readonly' : 'interactive'} ${size}`}
                    onClick={() => handleClick(i)}
                    onMouseEnter={() => !readOnly && setHoverValue(i)}
                    onMouseLeave={() => !readOnly && setHoverValue(0)}
                    title={`${i}/10`}
                >
                    ★
                </span>
            );
        }
        return stars;
    };

    return (
        <div className="rating-stars-container">
            {renderStars()}
            <span className="rating-value">{rating > 0 ? `${rating}/10` : 'Not rated'}</span>
        </div>
    );
};

export default RatingStars;
