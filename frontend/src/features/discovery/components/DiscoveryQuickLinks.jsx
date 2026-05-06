import { BookOpen, Film, Library, Tv, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const LINKS = [
  {
    label: 'Movies',
    description: 'Browse films to rate, review, and track.',
    to: '/media?types=Movie',
    icon: Film,
  },
  {
    label: 'TV Series',
    description: 'Find series and follow what is worth watching.',
    to: '/media?types=TvSeries',
    icon: Tv,
  },
  {
    label: 'Books',
    description: 'Keep books beside screen stories in one catalog.',
    to: '/media?types=Book',
    icon: BookOpen,
  },
  {
    label: 'Collections',
    description: 'Explore curated lists and saved media sets.',
    to: '/collections',
    icon: Library,
  },
  {
    label: 'Groups',
    description: 'Join conversations around shared favorites.',
    to: '/groups',
    icon: Users,
  },
];

function DiscoveryQuickLinks() {
  return (
    <nav className="discovery-quick-links" aria-label="Discovery shortcuts">
      {LINKS.map((link) => {
        const Icon = link.icon;

        return (
          <Link key={link.label} className="discovery-quick-link" to={link.to}>
            <span className="discovery-quick-link__icon">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span>
              <strong>{link.label}</strong>
              <small>{link.description}</small>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default DiscoveryQuickLinks;
