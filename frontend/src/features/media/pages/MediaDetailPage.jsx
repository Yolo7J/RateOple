import { useMemo, useState } from 'react';
import clsx from 'clsx';
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
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';

const MEDIA_TABS = ['Overview', 'Reviews', 'Collections', 'Similar'];

const styles = {
  pageStack: 'gap-6',
  backButton: [
    'inline-flex items-center rounded-lg border border-[var(--button-border)] px-4 py-2 text-sm font-medium',
    'bg-[var(--button-bg)] text-[var(--text-primary)] transition hover:bg-[var(--button-hover-bg)]',
  ].join(' '),
  hero: [
    'rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]',
    'p-4 sm:p-6',
  ].join(' '),
  heroImage: 'w-full aspect-[2/3] rounded-xl bg-[var(--card-cover-bg)] object-cover',
  muted: 'text-[var(--text-muted)]',
  error: 'text-[#ff7f7f]',
  tabRow: 'flex flex-wrap gap-2 border-b border-[var(--border)] pb-2',
  tabButton: [
    'rounded-full border border-transparent px-3 py-1.5 text-sm font-medium',
    'text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]',
  ].join(' '),
  tabButtonActive: 'border-[var(--primary-color)] text-[var(--text-primary)]',
  section: [
    'rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]',
    'p-4 sm:p-6',
  ].join(' '),
  sectionStack: 'gap-4',
  heroText: 'gap-3',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  description: 'text-[var(--text-secondary)]',
  sectionTitle: 'text-xl font-semibold',
};

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

  if (loading) {
    return (
      <PageLayout>
        <Container>
          <p className={styles.muted}>Loading media...</p>
        </Container>
      </PageLayout>
    );
  }

  if (error || !media) {
    return (
      <PageLayout>
        <Container>
          <p className={styles.error}>{errorMessage || 'Media not found.'}</p>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <button className={styles.backButton} onClick={() => navigate('/media')}>
            Back to Media List
          </button>

          <Grid variant="mediaHero" className={styles.hero}>
            <img
              src={buildImageUrl(media.coverUrl)}
              alt={media.title}
              className={styles.heroImage}
            />
            <Stack className={styles.heroText}>
              <h1 className={styles.title}>{media.title}</h1>
              <p className={styles.muted}>
                {media.type} · {media.releaseYear ?? media.releaseDate?.slice?.(0, 4) ?? 'N/A'}
              </p>
              <p className={styles.description}>
                {media.description || 'No description available.'}
              </p>
            </Stack>
          </Grid>

          <div className={styles.tabRow} role="tablist" aria-label="Media Details Tabs">
            {MEDIA_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={clsx(styles.tabButton, activeTab === tab && styles.tabButtonActive)}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Overview' ? (
            <Stack className={styles.sectionStack}>
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
            </Stack>
          ) : null}

          {activeTab === 'Reviews' ? (
            <section className={styles.section}>
              <Stack className={styles.sectionStack}>
                <h2 className={styles.sectionTitle}>Reviews</h2>
                <ReviewFilters value={sortBy} onChange={setSortBy} />

                {user && (summary?.userRating || ratingDto?.id) ? (
                  <ReviewEditor
                    onSubmit={handleCreateReview}
                    submitting={submittingReview}
                  />
                ) : null}

                {user && !summary?.userRating && !ratingDto?.id ? (
                  <p className={styles.muted}>Rate this media first to post a review.</p>
                ) : null}

                {actionError ? <p className={styles.error}>{actionError}</p> : null}
                <ReviewsList
                  reviews={sortedReviews}
                  loading={reviewLoading}
                  error={reviewError ? reviewErrorMessage : ''}
                />
              </Stack>
            </section>
          ) : null}

          {activeTab === 'Collections' ? (
            <section className={styles.section}>
              <Stack className={styles.sectionStack}>
                <h2 className={styles.sectionTitle}>Collections</h2>
                <p className={styles.muted}>Browse collections or create one and add this media.</p>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => navigate(`/collections?mediaId=${id}`)}
                >
                  Open Collections
                </button>
              </Stack>
            </section>
          ) : null}

          {activeTab === 'Similar' ? (
            <section className={styles.section}>
              <Stack className={styles.sectionStack}>
                <h2 className={styles.sectionTitle}>Similar Media</h2>
                <MediaRow items={similar} />
              </Stack>
            </section>
          ) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default MediaDetailPage;
