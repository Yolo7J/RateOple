const styles = {
  list: 'grid gap-3',
  card: 'flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4',
  muted: 'text-[var(--text-muted)]',
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
  meta: 'text-sm text-[var(--text-muted)]',
};

const SCOPE_LABELS = {
  1: 'Global',
  2: 'Group',
  3: 'Collection',
  4: 'Media',
};

function ModeratorAssignmentList({ assignments, onRemove, disabled = false }) {
  if (!assignments.length) {
    return <p className={styles.muted}>No assignments.</p>;
  }

  return (
    <div className={styles.list}>
      {assignments.map((assignment) => (
        <article
          key={`${assignment.userId}-${assignment.scopeType}-${assignment.scopeId ?? 'global'}`}
          className={styles.card}
        >
          <p>
            <strong>User:</strong> <code>{assignment.userId}</code>
          </p>
          <p>
            <strong>Scope:</strong> {SCOPE_LABELS[assignment.scopeType] || assignment.scopeType}
            {assignment.scopeId ? ` (${assignment.scopeId})` : ''}
          </p>
          <p className={styles.meta}>Assigned at: {new Date(assignment.assignedAt).toLocaleString()}</p>
          <button
            className={styles.button}
            type="button"
            disabled={disabled}
            onClick={() =>
              onRemove({
                userId: assignment.userId,
                scopeType: assignment.scopeType,
                scopeId: assignment.scopeId,
              })
            }
          >
            Remove assignment
          </button>
        </article>
      ))}
    </div>
  );
}

export default ModeratorAssignmentList;
