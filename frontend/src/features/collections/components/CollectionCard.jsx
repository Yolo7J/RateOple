import { Link } from 'react-router-dom';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import './collections.css';

function CollectionCard({ collection }) {
  return (
    <article className="ro-collection-card">
      <Link to={`/collections/${collection.id}`} className="ro-collection-link">
        <img
          src={buildImageUrl(collection.coverImageUrl)}
          alt={collection.name}
          className="ro-collection-cover"
        />
        <div className="ro-collection-meta">
          <h3>{collection.name}</h3>
          <p>{collection.items?.length ?? 0} items · {collection.followersCount ?? 0} followers</p>
          {collection.description ? <p className="ro-collection-description">{collection.description}</p> : null}
        </div>
      </Link>
    </article>
  );
}

export default CollectionCard;
