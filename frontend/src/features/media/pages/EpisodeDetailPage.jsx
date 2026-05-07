import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock3,
  Layers3,
  MessageCircle,
  PlayCircle,
  Star,
  Tv,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useMediaDetailsQuery } from '../queries/useMediaDetailsQuery';
import { useTvSeriesSeasonsQuery } from '../queries/useTvSeriesSeasonsQuery';
import { useEpisodeRatingSummaryQuery } from '../../ratings/queries/useEpisodeRatingSummaryQuery';
import { useRateEpisodeMutation } from '../../ratings/queries/useRateEpisodeMutation';
import { useDeleteEpisodeRatingMutation } from '../../ratings/queries/useDeleteEpisodeRatingMutation';
import RatingStars from '../../ratings/components/RatingStars';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Button from '../../../shared/ui/Button';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import {
  findEpisodeByNumber,
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
      <span>{userRating ? `You rated ${userRating}/10` : "You haven't rated this episode yet"}</span>
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

function EpisodeRatingPanel({ episode }) {
  const { user } = useAuth();
  const [value, setValue] = useState(10);
  const [ratingChanged, setRatingChanged] = useState(false);
  const [actionError, setActionError] = useState('');
  const { data: summary, refetch } = useEpisodeRatingSummaryQuery(episode.id);
  const { mutate: rateEpisode, loading: saving } = useRateEpisodeMutation();
  const { mutate: deleteEpisodeRating, loading: clearing } = useDeleteEpisodeRatingMutation();

  const selectedValue = ratingChanged ? value : summary?.userRating ?? value;

  const handleRatingChange = (nextValue) => {
    setValue(nextValue);
    setRatingChanged(true);
  };

  const handleRate = async (event) => {
    event.preventDefault();
    setActionError('');
    try {
      await rateEpisode(episode.id, selectedValue);
      await refetch();
      setValue(selectedValue);
      setRatingChanged(false);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Could not save episode rating.');
    }
  };

  const handleClear = async () => {
    setActionError('');
    try {
      await deleteEpisodeRating(episode.id);
      await refetch();
      setValue(10);
      setRatingChanged(false);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Could not clear episode rating.');
    }
  };

  return (
    <section className="media-detail-action-card media-detail-action-card--rating" aria-labelledby="episode-rating-title">
      <div className="media-detail-action-card__head">
        <span className="media-detail-action-card__icon">
          <Star size={18} fill="currentColor" aria-hidden="true" />
        </span>
        <div>
          <h2 id="episode-rating-title">Rate episode</h2>
          <p>{summary?.userRating ? `You rated this episode ${summary.userRating}/10.` : "You haven't rated this episode yet."}</p>
        </div>
      </div>

      <RatingScore
        averageRating={summary?.averageRating ?? 0}
        ratingsCount={summary?.ratingsCount ?? 0}
        userRating={summary?.userRating ?? null}
      />

      {user ? (
        <form className="media-detail-rating-form" onSubmit={handleRate}>
          <label className="media-detail-field-label" htmlFor="episode-rating-picker">Your episode rating</label>
          <RatingPicker
            id="episode-rating-picker"
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
        <InlineMessage tone="info">Sign in to rate this episode.</InlineMessage>
      )}

      {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}
    </section>
  );
}

function RouteState({ title, description, mediaId, seasonNumber }) {
  const target = mediaId && seasonNumber ? `/media/${mediaId}/seasons/${seasonNumber}` : mediaId ? `/media/${mediaId}` : '/media';

  return (
    <PageLayout>
      <Container size="xxl">
        <div className="media-detail-page">
          <section className="media-detail-state">
            <EmptyState title={title} description={description} />
            <Button as={Link} to={target} variant="primary">
              <ArrowLeft size={16} aria-hidden="true" />
              {mediaId && seasonNumber ? 'Back to season' : mediaId ? 'Back to series' : 'Back to Explore'}
            </Button>
          </section>
        </div>
      </Container>
    </PageLayout>
  );
}

function EpisodeDetailPage() {
  const { id, seasonNumber: seasonNumberParam, episodeNumber: episodeNumberParam } = useParams();
  const seasonNumber = normalizeNumberParam(seasonNumberParam);
  const episodeNumber = normalizeNumberParam(episodeNumberParam);
  const { data: media, loading: mediaLoading, error: mediaError } = useMediaDetailsQuery(id);
  const shouldFetchSeasons = media?.type === 'TvSeries';
  const { data: seasonsData, loading: seasonsLoading, error: seasonsError } = useTvSeriesSeasonsQuery(
    shouldFetchSeasons ? id : null
  );

  const seasons = useMemo(() => getTvSeasons(media, seasonsData), [media, seasonsData]);
  const season = useMemo(() => findSeasonByNumber(seasons, seasonNumber), [seasons, seasonNumber]);
  const episode = useMemo(() => findEpisodeByNumber(season, episodeNumber), [season, episodeNumber]);
  const loading = mediaLoading || (shouldFetchSeasons && seasonsLoading && !seasons.length);

  if (loading) {
    return (
      <PageLayout>
        <Container size="xxl">
          <div className="media-detail-page">
            <section className="media-detail-state">
              <p>Loading episode...</p>
            </section>
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (mediaError || seasonsError || !media) {
    return <RouteState title="Episode unavailable" description="Could not load this series episode." mediaId={id} />;
  }

  if (media.type !== 'TvSeries' || !seasonNumber || !season) {
    return <RouteState title="Season not found" description="This season does not exist for the selected series." mediaId={id} />;
  }

  if (!episodeNumber || !episode) {
    return (
      <RouteState
        title="Episode not found"
        description="This episode does not exist for the selected season."
        mediaId={id}
        seasonNumber={season.seasonNumber}
      />
    );
  }

  return (
    <PageLayout>
      <Container size="xxl">
        <div className="media-detail-page">
          <nav className="media-detail-breadcrumb" aria-label="Breadcrumb">
            <Link to={`/media/${id}`}>{media.title}</Link>
            <Link to={`/media/${id}/seasons/${season.seasonNumber}`}>Season {season.seasonNumber}</Link>
            <span>Episode {episode.episodeNumber}</span>
          </nav>

          <section className="media-detail-hero media-detail-route-hero">
            <div className="media-detail-hero__poster">
              <SeriesCover media={media} />
            </div>

            <div className="media-detail-hero__content">
              <div className="media-detail-hero__title-block">
                <span className="media-detail-kicker">
                  {media.title} / Season {season.seasonNumber}
                </span>
                <h1>{episode.title || `Episode ${episode.episodeNumber}`}</h1>
              </div>

              <div className="media-detail-chip-row" aria-label="Episode metadata">
                <span className="media-detail-chip" data-tone="accent">
                  <Tv size={15} aria-hidden="true" />
                  TV Episode
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
                  Episode {episode.episodeNumber}
                </span>
                {episode.duration ? (
                  <span className="media-detail-chip">
                    <Clock3 size={15} aria-hidden="true" />
                    {episode.duration} min
                  </span>
                ) : null}
              </div>

              <p className="media-detail-description">
                Current episode data includes title, episode number, season number, and duration when available.
              </p>
            </div>
          </section>

          <div className="media-detail-action-grid">
            <EpisodeRatingPanel episode={episode} />
            <section className="media-detail-action-card" aria-labelledby="episode-reviews-title">
              <div className="media-detail-action-card__head">
                <span className="media-detail-action-card__icon">
                  <MessageCircle size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 id="episode-reviews-title">Episode reviews</h2>
                  <p>Episode review feed is coming after target-aware review endpoints.</p>
                </div>
              </div>
              <InlineMessage tone="info">Episode reviews need backend target review endpoints.</InlineMessage>
            </section>
          </div>

          <div className="media-detail-route-actions">
            <Button as={Link} to={`/media/${id}/seasons/${season.seasonNumber}`} variant="primary">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to season
            </Button>
            <Button as={Link} to={`/media/${id}`} variant="ghost">
              Back to series
            </Button>
          </div>
        </div>
      </Container>
    </PageLayout>
  );
}

export default EpisodeDetailPage;
