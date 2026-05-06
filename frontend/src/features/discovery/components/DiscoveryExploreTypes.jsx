import { ArrowRight, BookOpen, Film, MessageSquare, Star, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';

const TYPES = [
  {
    label: 'Movies',
    description: 'Rate films, write reviews, build watchlists, and discuss favorites with the community.',
    to: '/media?types=Movie',
    icon: Film,
  },
  {
    label: 'TV Series',
    description: 'Track shows across seasons, discover popular series, and keep conversations in reach.',
    to: '/media?types=TvSeries',
    icon: Tv,
  },
  {
    label: 'Books',
    description: 'Review books beside screen media so every story you care about lives in one profile.',
    to: '/media?types=Book',
    icon: BookOpen,
  },
];

function DiscoveryExploreTypes() {
  return (
    <section className="discovery-type-section">
      <div className="discovery-section-header">
        <div className="discovery-section-header__copy">
          <h2>Explore by type</h2>
          <p>Move between movies, TV series, and books without leaving the same rating and discussion system.</p>
        </div>
      </div>
      <div className="discovery-type-grid">
        {TYPES.map((type) => {
          const Icon = type.icon;

          return (
            <Link key={type.label} className="discovery-type-card" to={type.to}>
              <span className="discovery-type-card__icon">
                <Icon size={24} aria-hidden="true" />
              </span>
              <span className="discovery-type-card__body">
                <strong>{type.label}</strong>
                <small>{type.description}</small>
              </span>
              <span className="discovery-type-card__signals" aria-hidden="true">
                <Star size={16} />
                <MessageSquare size={16} />
                <ArrowRight size={16} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default DiscoveryExploreTypes;
