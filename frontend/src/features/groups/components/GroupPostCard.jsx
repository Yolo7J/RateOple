import { Link } from 'react-router-dom';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';

const styles = {
  card: 'ui-card-interactive p-4',
  link: 'block text-inherit no-underline',
  header: 'mb-2',
  title: 'text-base font-semibold text-[var(--text-primary)]',
  muted: 'text-sm text-[var(--text-muted)]',
  body: 'text-sm text-[var(--text-secondary)]',
  mediaGrid: 'mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2',
  mediaItem: 'rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] p-2',
  mediaImage: 'mb-1 w-full rounded-md object-cover aspect-[2/3]',
  mediaTitle: 'text-xs text-[var(--text-secondary)]',
};

function GroupPostCard({ post }) {
  const media = Array.isArray(post.media) ? post.media : [];

  return (
    <article className={styles.card}>
      <Link to={`/groups/${post.groupId}/posts/${post.id}`} className={styles.link}>
        <header className={styles.header}>
          <h3 className={styles.title}>{post.title}</h3>
          <p className={styles.muted}>{new Date(post.createdAt).toLocaleString()}</p>
        </header>
        <p className={styles.body}>{post.content}</p>
        {media.length ? (
          <div className={styles.mediaGrid}>
            {media.map((item) => (
              <div key={item.mediaId} className={styles.mediaItem}>
                <img className={styles.mediaImage} src={buildImageUrl(item.coverUrl)} alt={item.title} />
                <span className={styles.mediaTitle}>{item.title}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Link>
    </article>
  );
}

export default GroupPostCard;
