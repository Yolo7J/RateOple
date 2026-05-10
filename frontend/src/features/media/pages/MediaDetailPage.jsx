import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowLeft,
  BookOpen,
  BookmarkCheck,
  Calendar,
  Clock3,
  Film,
  Layers3,
  MessageCircle,
  PencilLine,
  PlayCircle,
  Star,
  Tag,
  Tv,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useMediaDetailsQuery } from '../queries/useMediaDetailsQuery';
import { useTvSeriesSeasonsQuery } from '../queries/useTvSeriesSeasonsQuery';
import { useMediaRatingSummaryQuery } from '../../ratings/queries/useMediaRatingSummaryQuery';
import { useRateMediaMutation } from '../../ratings/queries/useRateMediaMutation';
import { useDeleteMediaRatingMutation } from '../../ratings/queries/useDeleteMediaRatingMutation';
import { useSeasonRatingSummaryQuery } from '../../ratings/queries/useSeasonRatingSummaryQuery';
import { useReviewsQuery } from '../../reviews/queries/useReviewsQuery';
import { useReviewMutations } from '../../reviews/queries/useReviewMutations';
import { useCollectionsContainingMediaQuery } from '../../collections/queries/useCollectionsQuery';
import CollectionCard from '../../collections/components/CollectionCard';
import { useSimilarMediaQuery } from '../../discovery/queries/useSimilarMediaQuery';
import { useMediaStatusMutation } from '../../users/queries/useMediaStatusMutation';
import RatingStars from '../../ratings/components/RatingStars';
import TargetReviewComposer from '../../reviews/components/TargetReviewComposer';
import ReviewFilters from '../../reviews/components/ReviewFilters';
import ReviewsList from '../../reviews/components/ReviewsList';
import MediaRow from '../../discovery/components/MediaRow';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import { STATUS_TYPES } from '../../../shared/constants/statusTypes';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Button from '../../../shared/ui/Button';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Select from '../../../shared/ui/Select';
import Tabs from '../../../shared/ui/Tabs';

const MEDIA_TABS = ['Overview', 'Reviews', 'Collections', 'Similar'];
const RATING_VALUES = Array.from({ length: 10 }, (_, index) => index + 1);

const TYPE_CONFIG = {
  Movie: { label: 'Movie', shortLabel: 'Film', Icon: Film },
  TvSeries: { label: 'TV Series', shortLabel: 'Series', Icon: Tv },
  Book: { label: 'Book', shortLabel: 'Book', Icon: BookOpen },
};

const STATUS_LABELS = {
  Movie: {
    Plan: 'Plan to watch',
    'On it': 'Watching',
    Done: 'Watched',
    Dropped: 'Dropped',
  },
  TvSeries: {
    Plan: 'Plan to watch',
    'On it': 'Watching',
    Done: 'Completed',
    Dropped: 'Dropped',
  },
  Book: {
    Plan: 'Plan to read',
    'On it': 'Reading',
    Done: 'Read',
    Dropped: 'Dropped',
  },
};

const MEDIA_ACTION_LABELS = {
  Movie: {
    rateTitle: 'Rate this movie',
    trackTitle: 'Track movie',
    reviewsTitle: 'Movie reviews',
    reviewFirst: 'Rate this movie first to write a review.',
    signedOutReview: 'Sign in and rate this movie to write a review.',
  },
  TvSeries: {
    rateTitle: 'Rate this series',
    trackTitle: 'Track series',
    reviewsTitle: 'Series reviews',
    reviewFirst: 'Rate this series first to write a review.',
    signedOutReview: 'Sign in and rate this series to write a review.',
  },
  Book: {
    rateTitle: 'Rate this book',
    trackTitle: 'Track reading',
    reviewsTitle: 'Book reviews',
    reviewFirst: 'Rate this book first to write a review.',
    signedOutReview: 'Sign in and rate this book to write a review.',
  },
};

const compactCount = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  return String(count);
};

const getYear = (media) => media?.releaseYear ?? media?.releaseDate?.slice?.(0, 4) ?? null;

const formatRuntime = (minutes) => {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return '';
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  if (!hours) return `${mins} min`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

const getStatusLabel = (mediaType, status) => STATUS_LABELS[mediaType]?.[status] ?? status;
const getMediaActionLabels = (mediaType) => MEDIA_ACTION_LABELS[mediaType] ?? MEDIA_ACTION_LABELS.Movie;

function CoverArtwork({ media, className = '' }) {
  const [failedImageUrl, setFailedImageUrl] = useState('');
  const imageUrl = useMemo(() => buildImageUrl(media?.coverUrl, ''), [media?.coverUrl]);
  const typeConfig = TYPE_CONFIG[media?.type] ?? TYPE_CONFIG.Movie;
  const Icon = typeConfig.Icon;
  const hasImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;

  return (
    <div className={clsx('media-detail-cover', className)} data-media-type={media?.type}>
      {hasImage ? (
        <img
          src={imageUrl}
          alt={media?.title ?? 'Media cover'}
          onError={() => setFailedImageUrl(imageUrl)}
        />
      ) : (
        <div className="media-detail-cover__placeholder" aria-label="No cover available">
          <Icon size={42} strokeWidth={1.7} aria-hidden="true" />
          <span>No cover</span>
        </div>
      )}
    </div>
  );
}

function MetaChip({ icon: Icon, children, tone = 'default' }) {
  if (!children) return null;

  return (
    <span className="media-detail-chip" data-tone={tone}>
      {Icon ? <Icon size={15} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

function RatingScore({ averageRating = 0, ratingsCount = 0, userRating = null, compact = false }) {
  const hasAverage = Number(averageRating) > 0;

  return (
    <div className={clsx('media-detail-rating-score', compact && 'media-detail-rating-score--compact')}>
      <div className="media-detail-rating-score__main">
        <Star size={compact ? 16 : 20} fill="currentColor" aria-hidden="true" />
        <strong>{hasAverage ? Number(averageRating).toFixed(1) : 'N/A'}</strong>
        {!compact ? <RatingStars rating={averageRating} /> : null}
      </div>
      <span>{compactCount(ratingsCount)} ratings</span>
      <span>{userRating ? `You rated ${userRating}/10` : "You haven't rated this yet"}</span>
    </div>
  );
}

function RatingPicker({ id, value, onChange, disabled = false, compact = false }) {
  if (compact) {
    return (
      <Select
        id={id}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className="media-detail-rating-select"
      >
        {RATING_VALUES.map((item) => (
          <option key={item} value={item}>{item}/10</option>
        ))}
      </Select>
    );
  }

  return (
    <div className="media-detail-rating-grid" role="group" aria-label="Choose a rating from 1 to 10">
      {RATING_VALUES.map((item) => (
        <button
          key={item}
          type="button"
          className={clsx('media-detail-rating-pill', value === item && 'is-selected')}
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

function MediaRatingPanel({
  mediaType,
  summary,
  user,
  initialRatingId,
  submitting,
  deleting,
  onRate,
  onDelete,
  onReviewClick,
}) {
  const [value, setValue] = useState(summary?.userRating ?? 10);
  const labels = getMediaActionLabels(mediaType);

  const handleSubmit = (event) => {
    event.preventDefault();
    onRate(value);
  };

  return (
    <section className="media-detail-action-card media-detail-action-card--rating" aria-labelledby="media-rating-title">
      <div className="media-detail-action-card__head">
        <span className="media-detail-action-card__icon">
          <Star size={18} fill="currentColor" aria-hidden="true" />
        </span>
        <div>
          <h2 id="media-rating-title">{labels.rateTitle}</h2>
          <p>{summary?.userRating ? `You rated this ${summary.userRating}/10.` : "You haven't rated this yet."}</p>
        </div>
      </div>

      <RatingScore
        averageRating={summary?.averageRating ?? 0}
        ratingsCount={summary?.ratingsCount ?? 0}
        userRating={summary?.userRating ?? null}
      />

      {user ? (
        <form className="media-detail-rating-form" onSubmit={handleSubmit}>
          <label className="media-detail-field-label" htmlFor="media-rating-picker">Your rating</label>
          <RatingPicker
            id="media-rating-picker"
            value={value}
            onChange={setValue}
            disabled={submitting || deleting}
          />
          <div className="media-detail-action-row">
            <Button type="submit" variant="primary" disabled={submitting || deleting}>
              {submitting ? 'Saving...' : 'Save rating'}
            </Button>
            <Button type="button" onClick={onReviewClick}>
              <PencilLine size={16} aria-hidden="true" />
              Write review
            </Button>
            {summary?.userRating || initialRatingId ? (
              <Button type="button" variant="ghost" onClick={onDelete} disabled={submitting || deleting}>
                {deleting ? 'Clearing...' : 'Clear rating'}
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <InlineMessage tone="info">Sign in to save a rating or write a review.</InlineMessage>
      )}
    </section>
  );
}

function StatusTracker({ mediaType, currentStatus, user, saving, onSave }) {
  const [status, setStatus] = useState(currentStatus || STATUS_TYPES[0]);
  const labels = getMediaActionLabels(mediaType);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(status);
  };

  return (
    <section className="media-detail-action-card" aria-labelledby="media-status-title">
      <div className="media-detail-action-card__head">
        <span className="media-detail-action-card__icon">
          <BookmarkCheck size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 id="media-status-title">{labels.trackTitle}</h2>
          <p>{user ? `Current status: ${getStatusLabel(mediaType, status)}` : 'Sign in to track progress.'}</p>
        </div>
      </div>

      {user ? (
        <form className="media-detail-status-form" onSubmit={handleSubmit}>
          <label className="media-detail-field-label" htmlFor="media-status">Status</label>
          <Select
            id="media-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={saving}
          >
            {STATUS_TYPES.map((item) => (
              <option key={item} value={item}>{getStatusLabel(mediaType, item)}</option>
            ))}
          </Select>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Update status'}
          </Button>
        </form>
      ) : (
        <InlineMessage tone="info">Your watch or reading status stays private until you sign in.</InlineMessage>
      )}
    </section>
  );
}

function MediaDetailHero({ media, summary, seasons, onReviewClick }) {
  const typeConfig = TYPE_CONFIG[media.type] ?? TYPE_CONFIG.Movie;
  const year = getYear(media);
  const runtime = media.type === 'Movie' ? formatRuntime(media.duration) : '';
  const episodeCount = seasons.reduce((total, season) => total + (season.episodes?.length ?? 0), 0);
  const seasonCount = media.seasonsCount ?? seasons.length;
  const heroImageUrl = buildImageUrl(media.coverUrl, '');
  const chips = [
    { icon: typeConfig.Icon, value: typeConfig.label, tone: 'accent' },
    { icon: Calendar, value: year },
    { icon: Clock3, value: runtime },
    { icon: BookOpen, value: media.type === 'Book' ? media.author : '' },
    {
      icon: Layers3,
      value: media.type === 'TvSeries' && seasonCount ? `${seasonCount} seasons` : '',
    },
    {
      icon: PlayCircle,
      value: media.type === 'TvSeries' && episodeCount ? `${episodeCount} episodes` : '',
    },
  ].filter((chip) => chip.value);

  return (
    <section className="media-detail-hero">
      {heroImageUrl ? (
        <img className="media-detail-hero__backdrop" src={heroImageUrl} alt="" aria-hidden="true" />
      ) : null}
      <div className="media-detail-hero__shade" aria-hidden="true" />

      <div className="media-detail-hero__poster">
        <CoverArtwork media={media} />
      </div>

      <div className="media-detail-hero__content">
        <Link className="media-detail-back-link" to="/media">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Explore
        </Link>

        <div className="media-detail-hero__title-block">
          <span className="media-detail-kicker">{typeConfig.shortLabel}</span>
          <h1>{media.title}</h1>
        </div>

        <div className="media-detail-chip-row" aria-label="Media metadata">
          {chips.map((chip) => (
            <MetaChip key={`${chip.value}-${chip.tone ?? 'default'}`} icon={chip.icon} tone={chip.tone}>
              {chip.value}
            </MetaChip>
          ))}
        </div>

        {media.genres?.length || media.tags?.length ? (
          <div className="media-detail-tag-row" aria-label="Genres and tags">
            {[...(media.genres ?? []), ...(media.tags ?? [])].slice(0, 10).map((item) => (
              <span key={item}>
                <Tag size={13} aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <p className="media-detail-description">
          {media.description || 'No description available yet.'}
        </p>

        <div className="media-detail-hero__summary">
          <RatingScore
            averageRating={summary?.averageRating ?? media.averageRating ?? 0}
            ratingsCount={summary?.ratingsCount ?? media.ratingsCount ?? 0}
            userRating={summary?.userRating ?? null}
            compact
          />
          <Button type="button" variant="primary" onClick={onReviewClick}>
            <MessageCircle size={17} aria-hidden="true" />
            Reviews
          </Button>
        </div>
      </div>
    </section>
  );
}

function DetailSpecs({ media, seasons }) {
  const episodeCount = seasons.reduce((total, season) => total + (season.episodes?.length ?? 0), 0);
  const rows = [
    ['Type', TYPE_CONFIG[media.type]?.label ?? media.type],
    ['Year', getYear(media)],
    ['Genres', media.genres?.join(', ')],
    ['Tags', media.tags?.join(', ')],
    ['Director', media.director],
    ['Runtime', media.type === 'Movie' ? formatRuntime(media.duration) : ''],
    ['Author', media.author],
    ['Pages', media.pages ? `${media.pages} pages` : ''],
    ['ISBN', media.isbn],
    ['Seasons', media.type === 'TvSeries' && (media.seasonsCount ?? seasons.length) ? media.seasonsCount ?? seasons.length : ''],
    ['Episodes', media.type === 'TvSeries' && episodeCount ? episodeCount : ''],
  ].filter(([, value]) => value);

  if (!rows.length) return null;

  return (
    <section className="media-detail-section" aria-labelledby="media-details-title">
      <div className="media-detail-section__header">
        <div>
          <h2 id="media-details-title">Details</h2>
          <p>Key catalog information for this title.</p>
        </div>
      </div>
      <dl className="media-detail-specs">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SeasonSummary({ seasonId }) {
  const { data: summary } = useSeasonRatingSummaryQuery(seasonId);

  return (
    <RatingScore
      averageRating={summary?.averageRating ?? 0}
      ratingsCount={summary?.ratingsCount ?? 0}
      userRating={summary?.userRating ?? null}
      compact
    />
  );
}

function TvSeasonLinkCard({ mediaId, season }) {
  const episodes = Array.isArray(season.episodes) ? season.episodes : [];

  return (
    <article className="media-detail-season-card media-detail-season-card--link">
      <Link
        to={`/media/${mediaId}/seasons/${season.seasonNumber}`}
        className="media-detail-season-card__summary"
        aria-label={`Open Season ${season.seasonNumber}`}
      >
        <span className="media-detail-season-number">S{season.seasonNumber}</span>
        <span className="media-detail-season-card__title">
          <strong>Season {season.seasonNumber}</strong>
          <small>{episodes.length} episode{episodes.length === 1 ? '' : 's'}</small>
        </span>
        <span className="media-detail-season-card__rating">
          <SeasonSummary seasonId={season.id} />
        </span>
        <span className="media-detail-season-card__toggle">
          Open season
        </span>
      </Link>
    </article>
  );
}

function TvSeasonsPanel({ mediaId, seasons, loading, error }) {
  return (
    <section className="media-detail-section media-detail-section--seasons" aria-labelledby="media-seasons-title">
      <div className="media-detail-section__header">
        <div>
          <h2 id="media-seasons-title">Seasons</h2>
          <p>Open a season page to browse episodes and rate that season.</p>
        </div>
      </div>

      {loading ? (
        <div className="media-detail-season-skeleton" role="status" aria-label="Loading seasons">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="ui-skeleton" />
          ))}
        </div>
      ) : null}

      {error ? <InlineMessage tone="error">Failed to load seasons.</InlineMessage> : null}

      {!loading && !error && seasons.length === 0 ? (
        <EmptyState title="No seasons available" description="This series does not have season data yet." />
      ) : null}

      {!loading && !error && seasons.length ? (
        <div className="media-detail-season-list">
          {seasons.map((season) => (
            <TvSeasonLinkCard
              key={season.id}
              mediaId={mediaId}
              season={season}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LoadingDetail() {
  return (
    <PageLayout>
      <Container size="xxl">
        <div className="media-detail-page">
          <section className="media-detail-loading-hero" aria-label="Loading media details">
            <div className="ui-skeleton media-detail-loading-poster" />
            <div className="media-detail-loading-copy">
              <div className="ui-skeleton" />
              <div className="ui-skeleton" />
              <div className="ui-skeleton" />
              <div className="ui-skeleton" />
            </div>
          </section>
          <div className="media-detail-loading-grid">
            <div className="ui-skeleton" />
            <div className="ui-skeleton" />
          </div>
        </div>
      </Container>
    </PageLayout>
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
  } = useReviewsQuery(id, { target: 'media' });
  const {
    data: collectionsContainingData,
    loading: collectionsLoading,
    error: collectionsError,
  } = useCollectionsContainingMediaQuery(id, activeTab === 'Collections');
  const { data: similarData } = useSimilarMediaQuery(id, 20);

  const { mutate: rateMedia, loading: submittingRating } = useRateMediaMutation();
  const { mutate: deleteMediaRating, loading: deletingRating } = useDeleteMediaRatingMutation();
  const { createReview, loading: submittingReview } = useReviewMutations();
  const { mutate: saveMediaStatus, loading: savingStatus } = useMediaStatusMutation();

  const reviews = useMemo(() => (Array.isArray(reviewsData) ? reviewsData : []), [reviewsData]);
  const collectionsContaining = useMemo(
    () => (Array.isArray(collectionsContainingData) ? collectionsContainingData : []),
    [collectionsContainingData],
  );
  const similar = Array.isArray(similarData) ? similarData : [];
  const seasons = useMemo(() => {
    if (Array.isArray(seasonsData) && seasonsData.length) return seasonsData;
    if (Array.isArray(media?.seasons)) return media.seasons;
    return [];
  }, [media?.seasons, seasonsData]);

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

  const handleDeleteRating = async () => {
    setActionError('');
    try {
      await deleteMediaRating(id);
      setRatingDto(null);
      await refetchSummary();
    } catch (e) {
      setActionError(e.response?.data?.message || 'Could not clear rating.');
    }
  };

  const handleCreateReview = async ({ ratingId, content }) => {
    setActionError('');
    await createReview({
      ratingId,
      content,
      containsSpoilers: false,
    });
  };

  const handleSaveStatus = async (status) => {
    setActionError('');
    try {
      await saveMediaStatus(id, status);
    } catch (e) {
      setActionError(e.response?.data?.message || 'Could not save status.');
    }
  };

  const showReviews = () => setActiveTab('Reviews');
  const directMediaRatingId = ratingDto?.id ?? summary?.currentUserRatingId ?? null;
  const targetLabel = media?.type === 'TvSeries' ? 'series' : media?.type === 'Book' ? 'book' : 'movie';

  if (loading) {
    return <LoadingDetail />;
  }

  if (error || !media) {
    return (
      <PageLayout>
        <Container size="xxl">
          <div className="media-detail-page">
            <section className="media-detail-state">
              <InlineMessage tone="error">{errorMessage || 'Media not found.'}</InlineMessage>
              <Button as={Link} to="/media" variant="primary">
                <ArrowLeft size={16} aria-hidden="true" />
                Back to Explore
              </Button>
            </section>
          </div>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container size="xxl">
        <div className="media-detail-page">
          <MediaDetailHero
            media={media}
            summary={summary}
            seasons={seasons}
            onReviewClick={showReviews}
          />

          <Tabs
            tabs={MEDIA_TABS}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel="Media detail sections"
            className="media-detail-tabs"
          />

          {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}

          {activeTab === 'Overview' ? (
            <div className="media-detail-overview">
              <div className="media-detail-action-grid">
                <MediaRatingPanel
                  key={`media-rating-${summary?.userRating ?? 'none'}`}
                  mediaType={media.type}
                  summary={summary}
                  user={user}
                  initialRatingId={ratingDto?.id}
                  submitting={submittingRating}
                  deleting={deletingRating}
                  onRate={handleRate}
                  onDelete={handleDeleteRating}
                  onReviewClick={showReviews}
                />
                <StatusTracker
                  key={`media-status-${media.id}-${media.userStatus || 'Plan'}`}
                  mediaType={media.type}
                  currentStatus={media.userStatus || 'Plan'}
                  user={user}
                  saving={savingStatus}
                  onSave={handleSaveStatus}
                />
              </div>

              <DetailSpecs media={media} seasons={seasons} />

              {shouldFetchSeasons ? (
                <TvSeasonsPanel
                  mediaId={id}
                  seasons={seasons}
                  loading={seasonsLoading}
                  error={seasonsError}
                />
              ) : null}
            </div>
          ) : null}

          {activeTab === 'Reviews' ? (
            <section className="media-detail-section media-detail-section--reviews">
              <div className="media-detail-section__header">
                <div>
                  <h2>{getMediaActionLabels(media.type).reviewsTitle}</h2>
                  <p>
                    {media.type === 'TvSeries'
                      ? 'Read direct series reviews or add your own after rating this title.'
                      : 'Read community reactions or add your own after rating this title.'}
                  </p>
                </div>
                <ReviewFilters value={sortBy} onChange={setSortBy} />
              </div>

              <div className="media-detail-review-editor">
                <TargetReviewComposer
                  targetLabel={targetLabel}
                  ratingId={directMediaRatingId}
                  userRating={ratingDto?.value ?? summary?.userRating ?? null}
                  user={user}
                  submitting={submittingReview}
                  onSubmit={handleCreateReview}
                  onSuccess={refetchReviews}
                  lockedMessage={getMediaActionLabels(media.type).reviewFirst}
                  signedOutMessage={getMediaActionLabels(media.type).signedOutReview}
                />
              </div>

              <ReviewsList
                reviews={sortedReviews}
                loading={reviewLoading}
                error={reviewError ? reviewErrorMessage : ''}
                emptyMessage={`No ${targetLabel} reviews yet.`}
              />
            </section>
          ) : null}

          {activeTab === 'Collections' ? (
            <section className="media-detail-section media-detail-section--collections">
              <div className="media-detail-section__header">
                <div>
                  <h2>Collections containing this title</h2>
                  <p>Browse public collections that include this title, plus your own private matches when signed in.</p>
                </div>
              </div>

              {collectionsLoading ? (
                <div className="media-detail-collections-skeleton" role="status" aria-label="Loading collections">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="ui-skeleton" />
                  ))}
                </div>
              ) : null}

              {collectionsError ? (
                <InlineMessage tone="error">Failed to load collections containing this title.</InlineMessage>
              ) : null}

              {!collectionsLoading && !collectionsError && collectionsContaining.length > 0 ? (
                <div className="media-detail-collections-grid">
                  {collectionsContaining.map((collection) => (
                    <CollectionCard key={collection.id} collection={collection} variant="compact" />
                  ))}
                </div>
              ) : null}

              {!collectionsLoading && !collectionsError && collectionsContaining.length === 0 ? (
                <EmptyState
                  title="No public collections include this title yet."
                  description="Start from the collections hub or create a new collection with this title already attached."
                  action={(
                    <div className="media-detail-collections-empty-actions">
                      <Button as={Link} to="/collections" variant="primary">
                        Browse collections
                      </Button>
                      {user ? (
                        <Button as={Link} to={`/collections/new?mediaId=${id}`} variant="ghost">
                          Create collection
                        </Button>
                      ) : null}
                    </div>
                  )}
                />
              ) : null}
            </section>
          ) : null}

          {activeTab === 'Similar' ? (
            <section className="media-detail-section">
              <div className="media-detail-section__header">
                <div>
                  <h2>Similar media</h2>
                  <p>Related movies, series, and books from the current discovery service.</p>
                </div>
              </div>
              {similar.length ? (
                <MediaRow items={similar} />
              ) : (
                <EmptyState title="No similar media yet" description="Related titles will appear here when the discovery service returns matches." />
              )}
            </section>
          ) : null}

          <Button type="button" variant="ghost" className="media-detail-bottom-back" onClick={() => navigate('/media')}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Explore
          </Button>
        </div>
      </Container>
    </PageLayout>
  );
}

export default MediaDetailPage;
