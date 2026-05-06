import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function DiscoverySectionHeader({ title, description, actionLabel, actionTo }) {
  return (
    <div className="discovery-section-header">
      <div className="discovery-section-header__copy">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actionLabel && actionTo ? (
        <Link className="discovery-section-header__link" to={actionTo}>
          <span>{actionLabel}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export default DiscoverySectionHeader;
