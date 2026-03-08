import { Link } from 'react-router-dom';
import './collections.css';

function CollectionTree({ collections }) {
  if (!Array.isArray(collections) || collections.length === 0) {
    return <p className="ro-muted">No nested collections yet.</p>;
  }

  return (
    <ul className="ro-collection-tree">
      {collections.map((collection) => (
        <li key={collection.id}>
          <Link to={`/collections/${collection.id}`}>{collection.name}</Link>
          <span className="ro-muted"> · {collection.items?.length ?? 0} items</span>
        </li>
      ))}
    </ul>
  );
}

export default CollectionTree;
