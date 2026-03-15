import { useState } from 'react';

const styles = {
  card: 'flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4',
  header: 'flex items-center justify-between gap-2',
  title: 'text-base font-semibold text-[var(--text-primary)]',
  chip: 'rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs',
  meta: 'text-sm text-[var(--text-muted)]',
  actions: 'flex flex-wrap items-center gap-2',
  select: [
    'min-w-[150px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-sm text-[var(--text-primary)]',
  ].join(' '),
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
};

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
    <article className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.title}>{TARGET_LABELS[report.targetType] || `Type ${report.targetType}`}</h3>
        <span className={styles.chip}>{STATUS_LABELS[report.status] || `Status ${report.status}`}</span>
      </header>

      <p className={styles.meta}>
        Target: <code>{report.targetId}</code>
      </p>
      <p className={styles.meta}>
        Created: {new Date(report.createdAt).toLocaleString()}
      </p>
      <p className="text-sm text-[var(--text-secondary)]">{report.reason}</p>

      <div className={styles.actions}>
        <select className={styles.select} value={nextStatus} onChange={(e) => setNextStatus(Number(e.target.value))}>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          className={styles.button}
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
