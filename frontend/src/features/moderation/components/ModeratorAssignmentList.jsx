import './moderation.css';

const SCOPE_LABELS = {
  1: 'Global',
  2: 'Group',
  3: 'Collection',
  4: 'Media',
};

function ModeratorAssignmentList({ assignments, onRemove, disabled = false }) {
  if (!assignments.length) {
    return <p className="ro-muted">No assignments.</p>;
  }

  return (
    <div className="ro-assignment-list">
      {assignments.map((assignment) => (
        <article
          key={`${assignment.userId}-${assignment.scopeType}-${assignment.scopeId ?? 'global'}`}
          className="ro-moderation-card"
        >
          <p>
            <strong>User:</strong> <code>{assignment.userId}</code>
          </p>
          <p>
            <strong>Scope:</strong> {SCOPE_LABELS[assignment.scopeType] || assignment.scopeType}
            {assignment.scopeId ? ` (${assignment.scopeId})` : ''}
          </p>
          <p className="ro-moderation-meta">Assigned at: {new Date(assignment.assignedAt).toLocaleString()}</p>
          <button
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
