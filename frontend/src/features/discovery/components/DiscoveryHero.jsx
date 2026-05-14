import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Film, MessageSquare, Play, Search, Star, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import Button from '../../../shared/ui/Button';
import { Skeleton } from '../../../shared/ui/LoadingState';

const TYPE_LABELS = {
  Movie: 'Movie',
  Book: 'Book',
  TvSeries: 'TV Series',
};

const PRODUCT_CHIPS = ['Movies', 'TV Series', 'Books', 'Reviews', 'Groups'];

const formatRating = (value) => {
  const rating = Number(value);
  return Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : '';
};

function DiscoveryHero({ item, user, loading }) {
  const [failedImageUrl, setFailedImageUrl] = useState('');
  const imageUrl = useMemo(() => buildImageUrl(item?.coverUrl, ''), [item?.coverUrl]);
  const hasImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;
  const rating = formatRating(item?.averageRating);
  const title = item?.title ?? '';
  const typeLabel = TYPE_LABELS[item?.type] ?? item?.type ?? 'Media';
  const greetingName = user?.username ? `, ${user.username}` : '';

  return (
    <section
      className="discovery-hero"
      style={hasImage ? { '--hero-image': `url("${imageUrl}")` } : undefined}
    >
      <div className="discovery-hero__content">
        <div className="discovery-hero__eyebrow">
          <span className="discovery-live-dot" aria-hidden="true" />
          {user ? `Welcome back${greetingName}` : 'RateOple discovery'}
        </div>
        <h1>{user ? 'Find your next story.' : 'Track, rate, review, and discuss every story you love.'}</h1>
        <p>
          {user
            ? 'Jump back into the catalog, keep your watchlist moving, and follow the conversations around movies, TV series, and books.'
            : 'RateOple brings movies, TV series, and books into one social media hub for discovery, ratings, reviews, and groups.'}
        </p>

        <div className="discovery-hero__actions">
          <Button as={Link} to="/media" variant="primary" size="lg">
            <Search size={18} aria-hidden="true" />
            Explore media
          </Button>
          <Button as={Link} to={user ? '/account/watchlist' : '/register'} size="lg">
            {user ? 'Open watchlist' : 'Join RateOple'}
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </div>

        <div className="discovery-hero__chips" aria-label="RateOple media and community areas">
          {PRODUCT_CHIPS.map((chip) => (
            <span key={chip}>{chip}</span>
          ))}
        </div>
      </div>

      <div className="discovery-hero__visual" aria-label={title ? `Featured: ${title}` : 'RateOple media hub'}>
        {loading ? (
          <Skeleton className="discovery-hero__skeleton" />
        ) : item ? (
          <Link className="discovery-feature" to={`/media/${item.id}`}>
            <div className="discovery-feature__poster">
              {hasImage ? (
                <img src={imageUrl} alt={title} loading="eager" fetchPriority="high" decoding="async" onError={() => setFailedImageUrl(imageUrl)} />
              ) : (
                <div className="discovery-feature__placeholder">
                  <Play size={34} aria-hidden="true" />
                  <span>No cover</span>
                </div>
              )}
            </div>
            <div className="discovery-feature__copy">
              <span className="discovery-feature__label">Featured from trending</span>
              <h2>{title}</h2>
              <div className="discovery-feature__meta">
                <span>{typeLabel}</span>
                {item.releaseYear ? <span>{item.releaseYear}</span> : null}
                {rating ? (
                  <span className="discovery-feature__rating">
                    <Star size={14} fill="currentColor" aria-hidden="true" />
                    {rating}
                  </span>
                ) : null}
              </div>
              <span className="discovery-feature__open">
                Open media
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </div>
          </Link>
        ) : (
          <div className="discovery-hero__empty">
            <div>
              <Film size={28} aria-hidden="true" />
              <Tv size={28} aria-hidden="true" />
              <BookOpen size={28} aria-hidden="true" />
            </div>
            <h2>One place for every story format.</h2>
            <p>Browse the catalog, rate what you finish, and discuss it with people who care about the same titles.</p>
            <MessageSquare size={22} aria-hidden="true" />
          </div>
        )}
      </div>
    </section>
  );
}

export default DiscoveryHero;
