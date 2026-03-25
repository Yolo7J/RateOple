const styles = {
  list: 'grid gap-3',
  card: 'flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4',
  highlight: 'live-highlight',
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
      {assignments.map((assignment) => {
        const assignedAtMs = new Date(assignment.assignedAt).getTime();
        const isRecent = Number.isFinite(assignedAtMs) && Date.now() - assignedAtMs < 60000;
        const moderatorName = assignment.userDisplayName || 'Unknown user';
        const assignedByName = assignment.assignedByDisplayName || 'Unknown user';
        const scopeName = assignment.scopeName || SCOPE_LABELS[assignment.scopeType] || 'Scope';
        return (
          <article
            key={`${assignment.userId}-${assignment.scopeType}-${assignment.scopeId ?? 'global'}`}
            className={`${styles.card} ${isRecent ? styles.highlight : ''}`}
          >
          <p>
            <strong>Moderator:</strong> {moderatorName}
          </p>
          <p>
            <strong>Scope:</strong> {scopeName}
          </p>
          <p className={styles.meta}>
            Assigned by: {assignedByName}
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
        );
      })}
    </div>
  );
}

export default ModeratorAssignmentList;
