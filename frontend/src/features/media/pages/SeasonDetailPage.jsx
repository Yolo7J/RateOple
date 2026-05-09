import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Layers3,
  MessageCircle,
  PlayCircle,
  Star,
  Tv,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useMediaDetailsQuery } from '../queries/useMediaDetailsQuery';
import { useTvSeriesSeasonsQuery } from '../queries/useTvSeriesSeasonsQuery';
import { useSeasonRatingSummaryQuery } from '../../ratings/queries/useSeasonRatingSummaryQuery';
import { useRateSeasonMutation } from '../../ratings/queries/useRateSeasonMutation';
import { useDeleteSeasonRatingMutation } from '../../ratings/queries/useDeleteSeasonRatingMutation';
import { useSeasonReviewsQuery } from '../../reviews/queries/useReviewsQuery';
import { useReviewMutations } from '../../reviews/queries/useReviewMutations';
import RatingStars from '../../ratings/components/RatingStars';
import TargetReviewComposer from '../../reviews/components/TargetReviewComposer';
import ReviewsList from '../../reviews/components/ReviewsList';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Button from '../../../shared/ui/Button';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import {
  findSeasonByNumber,
  getTvSeasons,
  normalizeNumberParam,
} from '../utils/tvRouteUtils';

const RATING_VALUES = Array.from({ length: 10 }, (_, index) => index + 1);

const compactCount = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  return String(count);
};

const getYear = (media) => media?.releaseYear ?? media?.releaseDate?.slice?.(0, 4) ?? null;

function SeriesCover({ media }) {
  const [failedImageUrl, setFailedImageUrl] = useState('');
  const imageUrl = useMemo(() => buildImageUrl(media?.coverUrl, ''), [media?.coverUrl]);
  const hasImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;

  return (
    <div className="media-detail-cover" data-media-type="TvSeries">
      {hasImage ? (
        <img src={imageUrl} alt={media?.title ?? 'Series cover'} onError={() => setFailedImageUrl(imageUrl)} />
      ) : (
        <div className="media-detail-cover__placeholder" aria-label="No cover available">
          <Tv size={42} strokeWidth={1.7} aria-hidden="true" />
          <span>No cover</span>
        </div>
      )}
    </div>
  );
}

function RatingScore({ averageRating = 0, ratingsCount = 0, userRating = null }) {
  const hasAverage = Number(averageRating) > 0;

  return (
    <div className="media-detail-rating-score">
      <div className="media-detail-rating-score__main">
        <Star size={20} fill="currentColor" aria-hidden="true" />
        <strong>{hasAverage ? Number(averageRating).toFixed(1) : 'N/A'}</strong>
        <RatingStars rating={averageRating} />
      </div>
      <span>{compactCount(ratingsCount)} ratings</span>
      <span>{userRating ? `You rated ${userRating}/10` : "You haven't rated this season yet"}</span>
    </div>
  );
}

function RatingPicker({ id, value, onChange, disabled }) {
  return (
    <div id={id} className="media-detail-rating-grid" role="group" aria-label="Choose a rating from 1 to 10">
      {RATING_VALUES.map((item) => (
        <button
          key={item}
          type="button"
          className={`media-detail-rating-pill${value === item ? ' is-selected' : ''}`}
          aria-pressed={value === item}
          onClick={() => onChange(item)}
          disabled={disabled}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function SeasonRatingPanel({ season }) {
  const { user } = useAuth();
  const [value, setValue] = useState(10);
  const [ratingChanged, setRatingChanged] = useState(false);
  const [actionError, setActionError] = useState('');
  const { data: summary, refetch } = useSeasonRatingSummaryQuery(season.id);
  const { mutate: rateSeason, loading: saving } = useRateSeasonMutation();
  const { mutate: deleteSeasonRating, loading: clearing } = useDeleteSeasonRatingMutation();

  const selectedValue = ratingChanged ? value : summary?.userRating ?? value;

  const handleRatingChange = (nextValue) => {
    setValue(nextValue);
    setRatingChanged(true);
  };

  const handleRate = async (event) => {
    event.preventDefault();
    setActionError('');
    try {
      await rateSeason(season.id, selectedValue);
      await refetch();
      setValue(selectedValue);
      setRatingChanged(false);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Could not save season rating.');
    }
  };

  const handleClear = async () => {
    setActionError('');
    try {
      await deleteSeasonRating(season.id);
      await refetch();
      setValue(10);
      setRatingChanged(false);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Could not clear season rating.');
    }
  };

  return (
    <section className="media-detail-action-card media-detail-action-card--rating" aria-labelledby="season-rating-title">
      <div className="media-detail-action-card__head">
        <span className="media-detail-action-card__icon">
          <Star size={18} fill="currentColor" aria-hidden="true" />
        </span>
        <div>
          <h2 id="season-rating-title">Rate Season {season.seasonNumber}</h2>
          <p>{summary?.userRating ? `You rated this season ${summary.userRating}/10.` : "You haven't rated this season yet."}</p>
        </div>
      </div>

      <RatingScore
        averageRating={summary?.averageRating ?? 0}
        ratingsCount={summary?.ratingsCount ?? 0}
        userRating={summary?.userRating ?? null}
      />

      {user ? (
        <form className="media-detail-rating-form" onSubmit={handleRate}>
          <label className="media-detail-field-label" htmlFor="season-rating-picker">Your season rating</label>
          <RatingPicker
            id="season-rating-picker"
            value={selectedValue}
            onChange={handleRatingChange}
            disabled={saving || clearing}
          />
          <div className="media-detail-action-row">
            <Button type="submit" variant="primary" disabled={saving || clearing}>
              {saving ? 'Saving...' : 'Save rating'}
            </Button>
            {summary?.userRating ? (
              <Button type="button" variant="ghost" onClick={handleClear} disabled={saving || clearing}>
                {clearing ? 'Clearing...' : 'Clear rating'}
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <InlineMessage tone="info">Sign in to rate this season.</InlineMessage>
      )}

      {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}
    </section>
  );
}

function RouteState({ title, description, mediaId }) {
  return (
    <PageLayout>
      <Container size="xxl">
        <div className="media-detail-page">
          <section className="media-detail-state">
            <EmptyState title={title} description={description} />
            <Button as={Link} to={mediaId ? `/media/${mediaId}` : '/media'} variant="primary">
              <ArrowLeft size={16} aria-hidden="true" />
              {mediaId ? 'Back to series' : 'Back to Explore'}
            </Button>
          </section>
        </div>
      </Container>
    </PageLayout>
  );
}

function SeasonDetailPage() {
  const { id, seasonNumber: seasonNumberParam } = useParams();
  const { user } = useAuth();
  const seasonNumber = normalizeNumberParam(seasonNumberParam);
  const { data: media, loading: mediaLoading, error: mediaError } = useMediaDetailsQuery(id);
  const shouldFetchSeasons = media?.type === 'TvSeries';
  const { data: seasonsData, loading: seasonsLoading, error: seasonsError } = useTvSeriesSeasonsQuery(
    shouldFetchSeasons ? id : null
  );

  const seasons = useMemo(() => getTvSeasons(media, seasonsData), [media, seasonsData]);
  const season = useMemo(() => findSeasonByNumber(seasons, seasonNumber), [seasons, seasonNumber]);
  const episodes = Array.isArray(season?.episodes) ? season.episodes : [];
  const {
    data: reviewsData,
    loading: reviewsLoading,
    error: reviewsError,
    refetch: refetchReviews,
  } = useSeasonReviewsQuery(season?.id);
  const { data: seasonSummary } = useSeasonRatingSummaryQuery(season?.id);
  const { createReview, loading: submittingReview } = useReviewMutations();
  const reviews = useMemo(() => (Array.isArray(reviewsData) ? reviewsData : []), [reviewsData]);
  const reviewsErrorMessage = reviewsError?.response?.data?.message || 'Failed to load season reviews.';
  const loading = mediaLoading || (shouldFetchSeasons && seasonsLoading && !seasons.length);

  const handleCreateReview = async ({ ratingId, content }) => {
    await createReview({
      ratingId,
      content,
      containsSpoilers: false,
    });
  };

  if (loading) {
    return (
      <PageLayout>
        <Container size="xxl">
          <div className="media-detail-page">
            <section className="media-detail-state">
              <p>Loading season...</p>
            </section>
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (mediaError || seasonsError || !media) {
    return <RouteState title="Season unavailable" description="Could not load this series season." mediaId={id} />;
  }

  if (media.type !== 'TvSeries' || !seasonNumber || !season) {
    return <RouteState title="Season not found" description="This season does not exist for the selected series." mediaId={id} />;
  }

  return (
    <PageLayout>
      <Container size="xxl">
        <div className="media-detail-page">
          <nav className="media-detail-breadcrumb" aria-label="Breadcrumb">
            <Link to={`/media/${id}`}>{media.title}</Link>
            <span>Season {season.seasonNumber}</span>
          </nav>

          <section className="media-detail-hero media-detail-route-hero">
            <div className="media-detail-hero__poster">
              <SeriesCover media={media} />
            </div>

            <div className="media-detail-hero__content">
              <div className="media-detail-hero__title-block">
                <span className="media-detail-kicker">{media.title}</span>
                <h1>Season {season.seasonNumber}</h1>
              </div>

              <div className="media-detail-chip-row" aria-label="Season metadata">
                <span className="media-detail-chip" data-tone="accent">
                  <Tv size={15} aria-hidden="true" />
                  TV Series
                </span>
                {getYear(media) ? (
                  <span className="media-detail-chip">
                    <Calendar size={15} aria-hidden="true" />
                    {getYear(media)}
                  </span>
                ) : null}
                <span className="media-detail-chip">
                  <Layers3 size={15} aria-hidden="true" />
                  Season {season.seasonNumber}
                </span>
                <span className="media-detail-chip">
                  <PlayCircle size={15} aria-hidden="true" />
                  {episodes.length} episode{episodes.length === 1 ? '' : 's'}
                </span>
              </div>

              <p className="media-detail-description">
                Browse episodes in this season and rate the season as its own TV target.
              </p>
            </div>
          </section>

          <div className="media-detail-action-grid">
            <SeasonRatingPanel season={season} />
            <section className="media-detail-action-card" aria-labelledby="season-reviews-title">
              <div className="media-detail-action-card__head">
                <span className="media-detail-action-card__icon">
                  <MessageCircle size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 id="season-reviews-title">Season reviews</h2>
                  <p>Reviews written for Season {season.seasonNumber}.</p>
                </div>
              </div>
              <TargetReviewComposer
                targetLabel="season"
                ratingId={seasonSummary?.currentUserRatingId ?? null}
                userRating={seasonSummary?.userRating ?? null}
                user={user}
                submitting={submittingReview}
                onSubmit={handleCreateReview}
                onSuccess={refetchReviews}
                lockedMessage={`Rate Season ${season.seasonNumber} first to write a review.`}
                signedOutMessage={`Sign in and rate Season ${season.seasonNumber} to write a review.`}
              />
              <ReviewsList
                reviews={reviews}
                loading={reviewsLoading}
                error={reviewsError ? reviewsErrorMessage : ''}
                surface={false}
                emptyMessage="No season reviews yet."
              />
            </section>
          </div>

          <section className="media-detail-section" aria-labelledby="season-episodes-title">
            <div className="media-detail-section__header">
              <div>
                <h2 id="season-episodes-title">Episodes</h2>
                <p>Open an episode page for focused episode details and rating.</p>
              </div>
            </div>

            {episodes.length ? (
              <div className="media-detail-episode-list">
                {episodes.map((episode) => (
                  <Link
                    key={episode.id}
                    to={`/media/${id}/seasons/${season.seasonNumber}/episodes/${episode.episodeNumber}`}
                    className="media-detail-episode-card media-detail-episode-card--link"
                  >
                    <div className="media-detail-episode-card__main">
                      <span className="media-detail-episode-number">E{episode.episodeNumber}</span>
                      <div>
                        <h4>{episode.title || `Episode ${episode.episodeNumber}`}</h4>
                        <p>{episode.duration ? `${episode.duration} min` : 'Runtime not listed'}</p>
                      </div>
                    </div>
                    <span className="media-detail-season-card__toggle">Open episode</span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No episodes available" description="This season does not have episode data yet." />
            )}
          </section>

          <div className="media-detail-route-actions">
            <Button as={Link} to={`/media/${id}`} variant="ghost">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to series
            </Button>
          </div>
        </div>
      </Container>
    </PageLayout>
  );
}

export default SeasonDetailPage;
