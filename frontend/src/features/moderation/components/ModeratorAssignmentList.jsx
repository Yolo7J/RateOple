import { useState } from 'react';
import EmptyState from '../../../shared/ui/EmptyState';
import Button from '../../../shared/ui/Button';
import Badge from '../../../shared/ui/Badge';
import Dialog from '../../../shared/ui/Dialog';

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
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  if (!assignments.length) {
    return <EmptyState title="No assignments" className="py-6" />;
  }

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await onRemove({
        userId: removeTarget.userId,
        scopeType: removeTarget.scopeType,
        scopeId: removeTarget.scopeId,
      });
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
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
            {' '}
            <Badge>{SCOPE_LABELS[assignment.scopeType] || 'Scope'}</Badge>
          </p>
          <p className={styles.meta}>
            Assigned by: {assignedByName}
          </p>
          <p className={styles.meta}>Assigned at: {new Date(assignment.assignedAt).toLocaleString()}</p>
          <Button
            size="sm"
            disabled={disabled}
            variant="danger"
            onClick={() => setRemoveTarget(assignment)}
          >
            Remove assignment
          </Button>
        </article>
        );
      })}
    </div>
    <Dialog
      open={Boolean(removeTarget)}
      title="Remove moderator assignment?"
      description={`Remove ${removeTarget?.userDisplayName || 'this moderator'} from ${removeTarget?.scopeName || SCOPE_LABELS[removeTarget?.scopeType] || 'this scope'}?`}
      onClose={() => {
        if (!removing) setRemoveTarget(null);
      }}
      actions={(
        <>
          <Button variant="ghost" onClick={() => setRemoveTarget(null)} disabled={removing}>Cancel</Button>
          <Button variant="danger" onClick={confirmRemove} disabled={removing}>
            {removing ? 'Removing...' : 'Remove assignment'}
          </Button>
        </>
      )}
    />
    </>
  );
}

export default ModeratorAssignmentList;
