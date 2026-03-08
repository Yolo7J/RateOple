import { useState } from 'react';
import './moderation.css';

const STATUS_LABELS = {
  1: 'Pending',
  2: 'In review',
  3: 'Resolved',
  4: 'Rejected',
};

const TARGET_LABELS = {
  1: 'User',
  2: 'Comment',
  3: 'Post',
  4: 'Review',
};

function ModerationReportRow({ report, onUpdateStatus, disabled = false }) {
  const [nextStatus, setNextStatus] = useState(() => Number(report.status || 1));

  return (
    <article className="ro-moderation-card">
      <header className="ro-moderation-card-head">
        <h3>{TARGET_LABELS[report.targetType] || `Type ${report.targetType}`}</h3>
        <span className="ro-chip">{STATUS_LABELS[report.status] || `Status ${report.status}`}</span>
      </header>

      <p className="ro-moderation-meta">
        Target: <code>{report.targetId}</code>
      </p>
      <p className="ro-moderation-meta">
        Created: {new Date(report.createdAt).toLocaleString()}
      </p>
      <p>{report.reason}</p>

      <div className="ro-moderation-actions">
        <select value={nextStatus} onChange={(e) => setNextStatus(Number(e.target.value))}>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={disabled || Number(report.status) === Number(nextStatus)}
          onClick={() => onUpdateStatus(report.id, nextStatus)}
        >
          Update status
        </button>
      </div>
    </article>
  );
}

export default ModerationReportRow;
