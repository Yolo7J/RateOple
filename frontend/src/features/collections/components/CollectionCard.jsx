import { Link } from 'react-router-dom';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';

const styles = {
  card: 'overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]',
  link: 'block text-inherit no-underline',
  cover: 'aspect-video w-full object-cover',
  meta: 'p-3',
  title: 'mb-1 text-base font-semibold text-[var(--text-primary)]',
  description: 'mt-2 text-sm text-[var(--text-secondary)]',
  metaText: 'text-sm text-[var(--text-muted)]',
};

function CollectionCard({ collection }) {
  return (
    <article className={styles.card}>
      <Link to={`/collections/${collection.id}`} className={styles.link}>
        <img
          src={buildImageUrl(collection.coverImageUrl)}
          alt={collection.name}
          className={styles.cover}
        />
        <div className={styles.meta}>
          <h3 className={styles.title}>{collection.name}</h3>
          <p className={styles.metaText}>
            {collection.items?.length ?? 0} items · {collection.followersCount ?? 0} followers
          </p>
          {collection.description ? <p className={styles.description}>{collection.description}</p> : null}
        </div>
      </Link>
    </article>
  );
}

export default CollectionCard;
