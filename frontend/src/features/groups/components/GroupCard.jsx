import { Link } from 'react-router-dom';

const styles = {
  card: 'ui-card-interactive h-full',
  link: 'block h-full p-4 text-inherit no-underline',
  title: 'mb-1 text-base font-semibold text-[var(--text-primary)]',
  description: 'text-sm text-[var(--text-secondary)]',
  meta: 'mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]',
  chip: 'ui-badge',
};

function GroupCard({ group }) {
  return (
    <article className={styles.card}>
      <Link to={`/groups/${group.id}`} className={styles.link}>
        <h3 className={styles.title}>{group.name}</h3>
        {group.description ? <p className={styles.description}>{group.description}</p> : null}
        <div className={styles.meta}>
          <span className={styles.chip}>{group.membersCount ?? 0} members</span>
          <span className={styles.chip}>{group.postsCount ?? 0} posts</span>
        </div>
      </Link>
    </article>
  );
}

export default GroupCard;
