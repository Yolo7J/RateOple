import { useState } from 'react';
import EmptyState from '../../../shared/ui/EmptyState';
import Button from '../../../shared/ui/Button';

const styles = {
  list: 'grid gap-3',
  card: 'ui-card flex flex-col gap-2 p-4',
  highlight: 'live-highlight',
  meta: 'text-sm text-[var(--text-muted)]',
};

const SCOPE_LABELS = {
  1: 'Global',
  2: 'Group',
  3: 'Collection',
  4: 'Media',
};

function ModeratorAssignmentList({ assignments, onRemove, disabled = false }) {
  const [now] = useState(() => Date.now());

  if (!assignments.length) {
    return <EmptyState title="No assignments" className="py-6" />;
  }

  return (
    <div className={styles.list}>
      {assignments.map((assignment) => {
        const assignedAtMs = new Date(assignment.assignedAt).getTime();
        const isRecent = Number.isFinite(assignedAtMs) && now - assignedAtMs < 60000;
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
          <Button
            size="sm"
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
          </Button>
        </article>
        );
      })}
    </div>
  );
}

export default ModeratorAssignmentList;
