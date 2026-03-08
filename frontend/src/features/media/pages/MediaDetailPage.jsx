import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useMediaDetailsQuery } from '../queries/useMediaDetailsQuery';
import { useMediaRatingSummaryQuery } from '../../ratings/queries/useMediaRatingSummaryQuery';
import { useRateMediaMutation } from '../../ratings/queries/useRateMediaMutation';
import { useReviewsQuery } from '../../reviews/queries/useReviewsQuery';
import { useReviewMutations } from '../../reviews/queries/useReviewMutations';
import { useSimilarMediaQuery } from '../../discovery/queries/useSimilarMediaQuery';
import { useMediaStatusMutation } from '../../users/queries/useMediaStatusMutation';
import UserRatingDisplay from '../../ratings/components/UserRatingDisplay';
import RatingSelector from '../../ratings/components/RatingSelector';
import ReviewEditor from '../../reviews/components/ReviewEditor';
import ReviewFilters from '../../reviews/components/ReviewFilters';
import ReviewsList from '../../reviews/components/ReviewsList';
import MediaRow from '../../discovery/components/MediaRow';
import MediaStatusSelector from '../components/MediaStatusSelector';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import '../../../pages/pages.css';
import '../../ratings/components/ratings.css';
import '../../reviews/components/reviews.css';
import '../../discovery/components/discovery.css';
import '../components/MediaStatusSelector.css';

const MEDIA_TABS = ['Overview', 'Reviews', 'Collections', 'Similar'];

function MediaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('Overview');
  const [sortBy, setSortBy] = useState('recent');
  const [ratingDto, setRatingDto] = useState(null);
  const [actionError, setActionError] = useState('');

  const { data: media, loading: mediaLoading, error: mediaError } = useMediaDetailsQuery(id);
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useMediaRatingSummaryQuery(id);
  const {
    data: reviewsData,
    loading: reviewLoading,
    error: reviewError,
    refetch: refetchReviews,
  } = useReviewsQuery(id);
  const { data: similarData } = useSimilarMediaQuery(id, 20);

  const { mutate: rateMedia, loading: submittingRating } = useRateMediaMutation();
  const { createReview, loading: submittingReview } = useReviewMutations();
  const { mutate: saveMediaStatus, loading: savingStatus } = useMediaStatusMutation();

  const reviews = useMemo(() => (Array.isArray(reviewsData) ? reviewsData : []), [reviewsData]);
  const similar = Array.isArray(similarData) ? similarData : [];

  const loading = mediaLoading || summaryLoading;
  const error = mediaError || summaryError;
  const errorMessage = error?.response?.data?.message || 'Failed to load media details.';
  const reviewErrorMessage = reviewError?.response?.data?.message || 'Failed to load reviews.';

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
    try {
      const dto = await rateMedia(id, value);
      setRatingDto(dto);
      await refetchSummary();
    } catch (e) {
      setActionError(e.response?.data?.message || 'Could not save rating.');
    }
  };

  const ensureRatingId = async () => {
    if (ratingDto?.id) return ratingDto.id;
    if (!summary?.userRating) return null;

    const dto = await rateMedia(id, summary.userRating);
    setRatingDto(dto);
    return dto.id;
  };

  const handleCreateReview = async (content) => {
    setActionError('');

    try {
      const ratingId = await ensureRatingId();
      if (!ratingId) {
        setActionError('Please rate this media first.');
        return;
      }

      await createReview({
        ratingId,
        content,
        containsSpoilers: false,
      });

      await refetchReviews();
    } catch (e) {
      setActionError(e.response?.data?.message || 'Could not post review.');
    }
  };

  const handleSaveStatus = async (status) => {
    setActionError('');
    try {
      await saveMediaStatus(id, status);
    } catch (e) {
      setActionError(e.response?.data?.message || 'Could not save status.');
    }
  };

  if (loading) return <main className="ro-page"><p>Loading media...</p></main>;
  if (error || !media) return <main className="ro-page"><p>{errorMessage || 'Media not found.'}</p></main>;

  return (
    <main className="ro-page ro-detail-page">
      <button className="ro-back" onClick={() => navigate('/media')}>Back to Media List</button>

      <section className="ro-detail-hero">
        <img
          src={buildImageUrl(media.coverUrl)}
          alt={media.title}
        />
        <div>
          <h1>{media.title}</h1>
          <p className="ro-muted">{media.type} · {media.releaseYear ?? media.releaseDate?.slice?.(0, 4) ?? 'N/A'}</p>
          <p>{media.description || 'No description available.'}</p>
        </div>
      </section>

      <div className="ro-tab-row" role="tablist" aria-label="Media Details Tabs">
        {MEDIA_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`ro-tab-btn${activeTab === tab ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' ? (
        <>
          <UserRatingDisplay
            averageRating={summary?.averageRating ?? 0}
            ratingsCount={summary?.ratingsCount ?? 0}
            userRating={summary?.userRating ?? null}
          />

          {user ? (
            <RatingSelector
              key={`rating-${summary?.userRating ?? 'none'}`}
              initialValue={summary?.userRating ?? 10}
              onSubmit={handleRate}
              submitting={submittingRating}
            />
          ) : null}

          {user ? (
            <MediaStatusSelector
              currentStatus={media.userStatus || 'Plan'}
              onSave={handleSaveStatus}
              saving={savingStatus}
            />
          ) : null}
        </>
      ) : null}

      {activeTab === 'Reviews' ? (
        <section className="ro-review-section">
          <h2>Reviews</h2>
          <ReviewFilters value={sortBy} onChange={setSortBy} />

          {user && (summary?.userRating || ratingDto?.id) ? (
            <ReviewEditor
              onSubmit={handleCreateReview}
              submitting={submittingReview}
            />
          ) : null}

          {user && !summary?.userRating && !ratingDto?.id ? (
            <p className="ro-muted">Rate this media first to post a review.</p>
          ) : null}

          {actionError ? <p className="ro-error">{actionError}</p> : null}
          <ReviewsList reviews={sortedReviews} loading={reviewLoading} error={reviewError ? reviewErrorMessage : ''} />
        </section>
      ) : null}

      {activeTab === 'Collections' ? (
        <section className="ro-review-section">
          <h2>Collections</h2>
          <p className="ro-muted">Browse collections or create one and add this media.</p>
          <button
            type="button"
            className="ro-back"
            onClick={() => navigate(`/collections?mediaId=${id}`)}
          >
            Open Collections
          </button>
        </section>
      ) : null}

      {activeTab === 'Similar' ? (
        <section className="ro-review-section">
          <h2>Similar Media</h2>
          <MediaRow items={similar} />
        </section>
      ) : null}
    </main>
  );
}

export default MediaDetailPage;
