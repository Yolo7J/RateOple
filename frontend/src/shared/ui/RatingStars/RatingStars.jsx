import React, { useState } from 'react';
import clsx from 'clsx';

const styles = {
    container: 'flex items-center gap-1',
    starBase: 'leading-none transition',
    starFilled: 'text-[#ffc107]',
    starEmpty: 'text-[#ccc]',
    starReadonly: 'cursor-default',
    starInteractive: 'cursor-pointer hover:scale-110',
    sizeSmall: 'text-[14px]',
    sizeMedium: 'text-[20px]',
    sizeLarge: 'text-[32px]',
    value: 'ml-2 text-sm text-[var(--text-secondary)]',
};

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
                    className={clsx(
                        styles.starBase,
                        isFilled ? styles.starFilled : styles.starEmpty,
                        readOnly ? styles.starReadonly : styles.starInteractive,
                        size === 'small' && styles.sizeSmall,
                        size === 'medium' && styles.sizeMedium,
                        size === 'large' && styles.sizeLarge,
                    )}
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
        <div className={styles.container}>
            {renderStars()}
            <span className={styles.value}>{rating > 0 ? `${rating}/10` : 'Not rated'}</span>
        </div>
    );
};

export default RatingStars;
