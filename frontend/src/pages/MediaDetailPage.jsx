import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMediaById } from '../features/media/services/mediaService';
import ratingService from '../features/ratings/services/ratingService';
import reviewService from '../features/reviews/services/reviewService';
import discoveryService from '../features/discovery/services/discoveryService';
import statusService from '../services/statusService';
import UserRatingDisplay from '../features/ratings/components/UserRatingDisplay';
import RatingSelector from '../features/ratings/components/RatingSelector';
import ReviewEditor from '../features/reviews/components/ReviewEditor';
import ReviewFilters from '../features/reviews/components/ReviewFilters';
import ReviewsList from '../features/reviews/components/ReviewsList';
import MediaRow from '../features/discovery/components/MediaRow';
import MediaStatusSelector from '../features/media/components/MediaStatusSelector';
import './pages.css';
import '../features/ratings/components/ratings.css';
import '../features/reviews/components/reviews.css';
import '../features/discovery/components/discovery.css';
import '../features/media/components/MediaStatusSelector.css';

function MediaDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [media, setMedia] = useState(null);
    const [summary, setSummary] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [similar, setSimilar] = useState([]);

    const [sortBy, setSortBy] = useState('recent');
    const [ratingDto, setRatingDto] = useState(null);

    const [loading, setLoading] = useState(true);
    const [reviewLoading, setReviewLoading] = useState(true);
    const [error, setError] = useState('');
    const [reviewError, setReviewError] = useState('');
    const [actionError, setActionError] = useState('');

    const [submittingRating, setSubmittingRating] = useState(false);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [savingStatus, setSavingStatus] = useState(false);

    const loadDetail = async () => {
        const [mediaData, ratingSummary] = await Promise.all([
            getMediaById(id),
            ratingService.getMediaSummary(id),
        ]);
        setMedia(mediaData);
        setSummary(ratingSummary);
    };

    const loadReviews = async () => {
        setReviewLoading(true);
        setReviewError('');
        try {
            const data = await reviewService.getMediaReviews(id);
            setReviews(Array.isArray(data) ? data : []);
        } catch (e) {
            setReviewError(e.response?.data?.message || 'Failed to load reviews.');
            setReviews([]);
        } finally {
            setReviewLoading(false);
        }
    };

    const loadSimilar = async () => {
        try {
            const data = await discoveryService.getSimilar(id, 20);
            setSimilar(Array.isArray(data) ? data : []);
        } catch {
            setSimilar([]);
        }
    };

    useEffect(() => {
        let mounted = true;

        const run = async () => {
            setLoading(true);
            setError('');

            try {
                await Promise.all([loadDetail(), loadReviews(), loadSimilar()]);
            } catch (e) {
                if (!mounted) return;
                setError(e.response?.data?.message || 'Failed to load media details.');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        run();
        return () => { mounted = false; };
    }, [id]);

    const sortedReviews = useMemo(() => {
        const copy = [...reviews];

        if (sortBy === 'highest') {
            copy.sort((a, b) => (b.ratingValue ?? 0) - (a.ratingValue ?? 0));
            return copy;
        }

        if (sortBy === 'lowest') {
            copy.sort((a, b) => (a.ratingValue ?? 0) - (b.ratingValue ?? 0));
            return copy;
        }

        copy.sort((a, b) => new Date(b.updatedAt ?? b.createdAt) - new Date(a.updatedAt ?? a.createdAt));
        return copy;
    }, [reviews, sortBy]);

    const handleRate = async (value) => {
        setActionError('');
        setSubmittingRating(true);
        try {
            const dto = await ratingService.rateMedia(id, value);
            setRatingDto(dto);
            const fresh = await ratingService.getMediaSummary(id);
            setSummary(fresh);
        } catch (e) {
            setActionError(e.response?.data?.message || 'Could not save rating.');
        } finally {
            setSubmittingRating(false);
        }
    };

    const ensureRatingId = async () => {
        if (ratingDto?.id) return ratingDto.id;
        if (!summary?.userRating) return null;

        const dto = await ratingService.rateMedia(id, summary.userRating);
        setRatingDto(dto);
        return dto.id;
    };

    const handleCreateReview = async (content) => {
        setActionError('');
        setSubmittingReview(true);

        try {
            const ratingId = await ensureRatingId();
            if (!ratingId) {
                setActionError('Please rate this media first.');
                return;
            }

            await reviewService.createReview({
                ratingId,
                content,
                containsSpoilers: false,
            });

            await loadReviews();
        } catch (e) {
            setActionError(e.response?.data?.message || 'Could not post review.');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleSaveStatus = async (status) => {
        setActionError('');
        setSavingStatus(true);
        try {
            await statusService.setMediaStatus(id, status);
        } catch (e) {
            setActionError(e.response?.data?.message || 'Could not save status.');
        } finally {
            setSavingStatus(false);
        }
    };

    if (loading) return <main className="ro-page"><p>Loading media...</p></main>;
    if (error || !media) return <main className="ro-page"><p>{error || 'Media not found.'}</p></main>;

    return (
        <main className="ro-page ro-detail-page">
            <button className="ro-back" onClick={() => navigate('/media')}>Back to Media List</button>

            <section className="ro-detail-hero">
                <img
                    src={media.coverUrl || 'https://placehold.co/320x480?text=No+Image'}
                    alt={media.title}
                />
                <div>
                    <h1>{media.title}</h1>
                    <p className="ro-muted">{media.type} · {media.releaseYear ?? media.releaseDate?.slice?.(0, 4) ?? 'N/A'}</p>
                    <p>{media.description || 'No description available.'}</p>
                </div>
            </section>

            <UserRatingDisplay
                averageRating={summary?.averageRating ?? 0}
                ratingsCount={summary?.ratingsCount ?? 0}
                userRating={summary?.userRating ?? null}
            />

            {user && (
                <RatingSelector
                    initialValue={summary?.userRating ?? 10}
                    onSubmit={handleRate}
                    submitting={submittingRating}
                />
            )}

            {user && (
                <MediaStatusSelector
                    currentStatus={media.userStatus || 'Plan'}
                    onSave={handleSaveStatus}
                    saving={savingStatus}
                />
            )}

            <section className="ro-review-section">
                <h2>Reviews</h2>
                <ReviewFilters value={sortBy} onChange={setSortBy} />

                {user && (summary?.userRating || ratingDto?.id) && (
                    <ReviewEditor
                        onSubmit={handleCreateReview}
                        submitting={submittingReview}
                    />
                )}

                {user && !summary?.userRating && !ratingDto?.id && (
                    <p className="ro-muted">Rate this media first to post a review.</p>
                )}

                {actionError && <p className="ro-error">{actionError}</p>}
                <ReviewsList reviews={sortedReviews} loading={reviewLoading} error={reviewError} />
            </section>

            <section className="ro-review-section">
                <h2>Similar Media</h2>
                <MediaRow items={similar} />
            </section>
        </main>
    );
}

export default MediaDetailPage;
