import { buildImageUrl } from '../../../shared/utils/buildImageUrl';

const styles = {
  card: 'rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4',
  header: 'mb-2',
  title: 'text-base font-semibold text-[var(--text-primary)]',
  muted: 'text-sm text-[var(--text-muted)]',
  body: 'text-sm text-[var(--text-secondary)]',
  mediaGrid: 'mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2',
  mediaItem: 'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-2',
  mediaImage: 'mb-1 w-full rounded-md object-cover aspect-[2/3]',
  mediaTitle: 'text-xs text-[var(--text-secondary)]',
};

function GroupPostCard({ post }) {
  const media = Array.isArray(post.media) ? post.media : [];

  return (
    <article className={styles.card}>
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
    </article>
  );
}

export default GroupPostCard;
