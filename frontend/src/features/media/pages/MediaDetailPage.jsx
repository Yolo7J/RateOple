import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useMediaDetailsQuery } from '../queries/useMediaDetailsQuery';
import { useTvSeriesSeasonsQuery } from '../queries/useTvSeriesSeasonsQuery';
import { useMediaRatingSummaryQuery } from '../../ratings/queries/useMediaRatingSummaryQuery';
import { useRateMediaMutation } from '../../ratings/queries/useRateMediaMutation';
import { useSeasonRatingSummaryQuery } from '../../ratings/queries/useSeasonRatingSummaryQuery';
import { useEpisodeRatingSummaryQuery } from '../../ratings/queries/useEpisodeRatingSummaryQuery';
import { useRateSeasonMutation } from '../../ratings/queries/useRateSeasonMutation';
import { useRateEpisodeMutation } from '../../ratings/queries/useRateEpisodeMutation';
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
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import Tabs from '../../../shared/ui/Tabs';

const MEDIA_TABS = ['Overview', 'Reviews', 'Collections', 'Similar'];

const styles = {
  pageStack: 'gap-6',
  hero: 'ui-card p-4 sm:p-6',
  heroImage: 'w-full aspect-[2/3] rounded-xl bg-[var(--card-cover-bg)] object-cover',
  muted: 'text-[var(--text-muted)]',
  section: 'ui-card p-4 sm:p-6',
  sectionStack: 'gap-4',
  heroText: 'gap-3',
  title: 'ui-page-title',
  description: 'text-[var(--text-secondary)]',
  sectionTitle: 'ui-section-title',
  seasonsCard: 'ui-card p-4 sm:p-6',
  seasonCard: 'ui-panel p-4',
  seasonHeader: 'flex flex-wrap items-center justify-between gap-3',
  seasonTitle: 'text-lg font-semibold text-[var(--text-primary)]',
  seasonMeta: 'text-xs text-[var(--text-muted)]',
  episodeList: 'mt-4 grid gap-3',
  episodeCard: 'ui-panel p-3 sm:p-4',
  episodeTitle: 'text-sm font-semibold text-[var(--text-primary)]',
  episodeMeta: 'text-xs text-[var(--text-muted)]',
  ratingBlock: 'mt-3 ui-panel p-3 sm:p-4',
};

function SeasonRatingReview({ seasonId, user }) {
  const [ratingDto, setRatingDto] = useState(null);
  const [actionError, setActionError] = useState('');
  const { data: summary, refetch } = useSeasonRatingSummaryQuery(seasonId);
  const { mutate: rateSeason, loading: submittingRating } = useRateSeasonMutation();
  const { createReview, loading: submittingReview } = useReviewMutations();

  const handleRate = async (value) => {
    setActionError('');
    try {
      const dto = await rateSeason(seasonId, value);
      setRatingDto(dto);
      await refetch();
    } catch (e) {
      setActionError(e.response?.data?.message || 'Could not save rating.');
    }
  };

  const ensureRatingId = async () => {
    if (ratingDto?.id) return ratingDto.id;
    if (!summary?.userRating) return null;
    const dto = await rateSeason(seasonId, summary.userRating);
    setRatingDto(dto);
    return dto.id;
  };

  const handleCreateReview = async (content) => {
    setActionError('');
    try {
      const ratingId = await ensureRatingId();
      if (!ratingId) {
        setActionError('Please rate this season first.');
        return;
      }
      await createReview({
        ratingId,
        content,
        containsSpoilers: false,
      });
    } catch (e) {
      setActionError(e.response?.data?.message || 'Could not post review.');
    }
  };

  return (
    <div className={styles.ratingBlock}>
      <UserRatingDisplay
        averageRating={summary?.averageRating ?? 0}
        ratingsCount={summary?.ratingsCount ?? 0}
        userRating={summary?.userRating ?? null}
      />

      {user ? (
        <RatingSelector
          key={`season-rating-${summary?.userRating ?? 'none'}`}
          initialValue={summary?.userRating ?? 10}
          onSubmit={handleRate}
          submitting={submittingRating}
        />
      ) : null}

      {user && (summary?.userRating || ratingDto?.id) ? (
        <ReviewEditor
          onSubmit={handleCreateReview}
          submitting={submittingReview}
        />
      ) : null}

      {user && !summary?.userRating && !ratingDto?.id ? (
        <p className={styles.muted}>Rate this season first to post a review.</p>
      ) : null}

      {actionError ? <InlineMessage tone="error" className="mt-3">{actionError}</InlineMessage> : null}
    </div>
  );
}

function EpisodeRatingReview({ episodeId, user }) {
  const [ratingDto, setRatingDto] = useState(null);
  const [actionError, setActionError] = useState('');
  const { data: summary, refetch } = useEpisodeRatingSummaryQuery(episodeId);
  const { mutate: rateEpisode, loading: submittingRating } = useRateEpisodeMutation();
  const { createReview, loading: submittingReview } = useReviewMutations();

  const handleRate = async (value) => {
    setActionError('');
    try {
      const dto = await rateEpisode(episodeId, value);
      setRatingDto(dto);
      await refetch();
    } catch (e) {
      setActionError(e.response?.data?.message || 'Could not save rating.');
    }
  };

  const ensureRatingId = async () => {
    if (ratingDto?.id) return ratingDto.id;
    if (!summary?.userRating) return null;
    const dto = await rateEpisode(episodeId, summary.userRating);
    setRatingDto(dto);
    return dto.id;
  };

  const handleCreateReview = async (content) => {
    setActionError('');
    try {
      const ratingId = await ensureRatingId();
      if (!ratingId) {
        setActionError('Please rate this episode first.');
        return;
      }
      await createReview({
        ratingId,
        content,
        containsSpoilers: false,
      });
    } catch (e) {
      setActionError(e.response?.data?.message || 'Could not post review.');
    }
  };

  return (
    <div className={styles.ratingBlock}>
      <UserRatingDisplay
        averageRating={summary?.averageRating ?? 0}
        ratingsCount={summary?.ratingsCount ?? 0}
        userRating={summary?.userRating ?? null}
      />

      {user ? (
        <RatingSelector
          key={`episode-rating-${summary?.userRating ?? 'none'}`}
          initialValue={summary?.userRating ?? 10}
          onSubmit={handleRate}
          submitting={submittingRating}
        />
      ) : null}

      {user && (summary?.userRating || ratingDto?.id) ? (
        <ReviewEditor
          onSubmit={handleCreateReview}
          submitting={submittingReview}
        />
      ) : null}

      {user && !summary?.userRating && !ratingDto?.id ? (
        <p className={styles.muted}>Rate this episode first to post a review.</p>
      ) : null}

      {actionError ? <InlineMessage tone="error" className="mt-3">{actionError}</InlineMessage> : null}
    </div>
  );
}

function MediaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('Overview');
  const [sortBy, setSortBy] = useState('recent');
  const [ratingDto, setRatingDto] = useState(null);
  const [actionError, setActionError] = useState('');
  const [openSeasonId, setOpenSeasonId] = useState(null);

  const { data: media, loading: mediaLoading, error: mediaError } = useMediaDetailsQuery(id);
  const shouldFetchSeasons = media?.type === 'TvSeries';
  const {
    data: seasonsData,
    loading: seasonsLoading,
    error: seasonsError,
  } = useTvSeriesSeasonsQuery(shouldFetchSeasons ? id : null);
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
  const seasons = Array.isArray(seasonsData) ? seasonsData : [];

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
          <LoadingState label="Loading media..." />
        </Container>
      </PageLayout>
    );
  }

  if (error || !media) {
    return (
      <PageLayout>
        <Container>
          <InlineMessage tone="error">{errorMessage || 'Media not found.'}</InlineMessage>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <div>
            <Button variant="ghost" onClick={() => navigate('/media')}>Back to Media List</Button>
          </div>

          <Grid variant="mediaHero" className={styles.hero}>
            <img
              src={buildImageUrl(media.coverUrl)}
              alt={media.title}
              className={styles.heroImage}
            />
            <Stack className={styles.heroText}>
              <h1 className={styles.title}>{media.title}</h1>
              <div className="flex flex-wrap gap-2">
                <Badge tone="info">{media.type}</Badge>
                <Badge>{media.releaseYear ?? media.releaseDate?.slice?.(0, 4) ?? 'N/A'}</Badge>
              </div>
              <p className={styles.description}>
                {media.description || 'No description available.'}
              </p>
            </Stack>
          </Grid>

          <Tabs
            tabs={MEDIA_TABS}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel="Media Details Tabs"
          />

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

              {shouldFetchSeasons ? (
                <section className={styles.seasonsCard}>
                  <Stack className={styles.sectionStack}>
                    <h2 className={styles.sectionTitle}>Seasons</h2>

                    {seasonsLoading ? (
                      <LoadingState label="Loading seasons..." />
                    ) : seasonsError ? (
                      <InlineMessage tone="error">Failed to load seasons.</InlineMessage>
                    ) : seasons.length === 0 ? (
                      <EmptyState title="No seasons found" description="This series does not have season data yet." />
                    ) : (
                      <Stack className={styles.sectionStack}>
                        {seasons.map((season) => {
                          const isOpen = openSeasonId === season.id;
                          return (
                            <div key={season.id} className={styles.seasonCard}>
                              <div className={styles.seasonHeader}>
                                <div>
                                  <p className={styles.seasonTitle}>Season {season.seasonNumber}</p>
                                  <p className={styles.seasonMeta}>
                                    {(season.episodes ?? []).length} episodes
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setOpenSeasonId(isOpen ? null : season.id)}
                                >
                                  {isOpen ? 'Hide' : 'View'}
                                </Button>
                              </div>

                              {isOpen ? (
                                <div className="mt-4">
                                  <SeasonRatingReview seasonId={season.id} user={user} />

                                  <div className={styles.episodeList}>
                                    {(season.episodes ?? []).map((ep) => (
                                      <div key={ep.id} className={styles.episodeCard}>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div>
                                            <p className={styles.episodeTitle}>
                                              E{ep.episodeNumber} · {ep.title || `Episode ${ep.episodeNumber}`}
                                            </p>
                                            {ep.duration ? (
                                              <p className={styles.episodeMeta}>{ep.duration} min</p>
                                            ) : null}
                                          </div>
                                        </div>

                                        <EpisodeRatingReview episodeId={ep.id} user={user} />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </Stack>
                    )}
                  </Stack>
                </section>
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

                {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}
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
                <Button
                  type="button"
                  onClick={() => navigate(`/collections?mediaId=${id}`)}
                >
                  Open Collections
                </Button>
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
