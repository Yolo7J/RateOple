import { Link } from 'react-router-dom';

const styles = {
  card: 'rounded-xl border border-[var(--border)] bg-[var(--card-bg)]',
  link: 'block p-3 text-inherit no-underline',
  title: 'mb-1 text-base font-semibold text-[var(--text-primary)]',
  description: 'text-sm text-[var(--text-secondary)]',
  meta: 'mt-3 flex gap-3 text-xs text-[var(--text-muted)]',
};

function GroupCard({ group }) {
  return (
    <article className={styles.card}>
      <Link to={`/groups/${group.id}`} className={styles.link}>
        <h3 className={styles.title}>{group.name}</h3>
        {group.description ? <p className={styles.description}>{group.description}</p> : null}
        <div className={styles.meta}>
          <span>{group.membersCount ?? 0} members</span>
          <span>{group.postsCount ?? 0} posts</span>
        </div>
      </Link>
    </article>
  );
}

export default GroupCard;
