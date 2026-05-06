import { ArrowRight, Library, MessageCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const CARDS = [
  {
    label: 'Join groups built around the media you love',
    description: 'Use groups for focused discussions around titles, genres, creators, and shared taste.',
    to: '/groups',
    action: 'Browse groups',
    icon: Users,
  },
  {
    label: 'Create collections and follow lists',
    description: 'Collections turn your media picks into lists people can revisit and discuss.',
    to: '/collections',
    action: 'Explore collections',
    icon: Library,
  },
];

function DiscoveryCommunityPanel() {
  return (
    <section className="discovery-community">
      <div className="discovery-community__intro">
        <span className="discovery-community__icon">
          <MessageCircle size={22} aria-hidden="true" />
        </span>
        <div>
          <h2>Reviews are better when they start conversations.</h2>
          <p>
            RateOple connects catalog discovery with the social spaces around it, without pretending
            there is activity before real people create it.
          </p>
        </div>
      </div>
      <div className="discovery-community__cards">
        {CARDS.map((card) => {
          const Icon = card.icon;

          return (
            <Link key={card.label} className="discovery-community-card" to={card.to}>
              <Icon size={22} aria-hidden="true" />
              <strong>{card.label}</strong>
              <small>{card.description}</small>
              <span>
                {card.action}
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default DiscoveryCommunityPanel;
