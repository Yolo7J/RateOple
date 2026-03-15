import { Link } from 'react-router-dom';

const styles = {
  list: 'ml-4 list-disc space-y-1 text-sm text-[var(--text-secondary)]',
  muted: 'text-[var(--text-muted)]',
  link: 'text-[var(--text-primary)] hover:text-[var(--primary-color)]',
};

function CollectionTree({ collections }) {
  if (!Array.isArray(collections) || collections.length === 0) {
    return <p className={styles.muted}>No nested collections yet.</p>;
  }

  return (
    <ul className={styles.list}>
      {collections.map((collection) => (
        <li key={collection.id}>
          <Link className={styles.link} to={`/collections/${collection.id}`}>
            {collection.name}
          </Link>
          <span className={styles.muted}> · {collection.items?.length ?? 0} items</span>
        </li>
      ))}
    </ul>
  );
}

export default CollectionTree;
