import React, { useState, useEffect } from 'react';
import './MediaCard.css';
import RatingStars from '../../ui/RatingStars/RatingStars';
import ratingService from '../../../services/ratingService';
import { useLanguage } from '../../../hooks/useLanguage';

const MediaCard = ({ media, onRatingChanged }) => {
    const { t } = useLanguage();
    const [userRating, setUserRating] = useState(media.userRating || 0);
    const [averageRating, setAverageRating] = useState(media.averageRating || 0);
    const [ratingsCount, setRatingsCount] = useState(media.ratingsCount || 0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // If media has ID, we could fetch fresh rating data here
        // or rely on props passed from parent
        setUserRating(media.userRating || 0);
        setAverageRating(media.averageRating || 0);
        setRatingsCount(media.ratingsCount || 0);
    }, [media]);

    const handleRate = async (value) => {
        if (!media.id) return;
        setIsLoading(true);
        try {
            await ratingService.rateMedia(media.id, value);
            setUserRating(value);

            // Optimistic update of aggregates (optional, or re-fetch)
            // Usually better to re-fetch summary
            const summary = await ratingService.getSummary(media.id);
            setAverageRating(summary.averageRating);
            setRatingsCount(summary.ratingsCount);

            if (onRatingChanged) onRatingChanged(media.id, value);
        } catch (error) {
            console.error('Rating failed', error);
            // Revert on error
            setUserRating(media.userRating || 0);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="media-card">
            <div className="media-poster">
                {media.posterUrl ? (
                    <img src={media.posterUrl} alt={media.title} />
                ) : (
                    <div className="poster-placeholder">{media.title?.[0]}</div>
                )}
            </div>
            <div className="media-content">
                <h3 className="media-title">{media.title}</h3>
                <p className="media-meta">
                    {media.year} • {t(`mediaTypes.${media.type}`, media.type)}
                </p>

                <div className="media-rating-section">
                    <div className="average-rating">
                        <span className="star-icon">★</span>
                        <span className="score">{averageRating.toFixed(1)}</span>
                        <span className="count">({ratingsCount})</span>
                    </div>

                    <div className="user-rating-action">
                        <p className="rate-label">{t('media.rateThis')}:</p>
                        <RatingStars
                            initialRating={userRating}
                            onRate={handleRate}
                            size="medium"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaCard;
