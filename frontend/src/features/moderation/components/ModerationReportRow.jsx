import { useMemo, useState } from 'react';
import { formatDate } from '../../../shared/utils/formatDate';

const styles = {
  card: 'flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4',
  header: 'flex flex-wrap items-center justify-between gap-2',
  title: 'text-base font-semibold text-[var(--text-primary)]',
  subtitle: 'text-sm text-[var(--text-muted)]',
  chip: 'rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs',
  meta: 'text-sm text-[var(--text-muted)]',
  actions: 'flex flex-wrap items-center gap-2',
  input: [
    'min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  ].join(' '),
  banSection: 'mt-2 grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3',
  banRow: 'flex flex-wrap items-center gap-2',
  error: 'text-sm text-[#ff7f7f]',
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

function ModerationReportRow({
  report,
  onUpdateStatus,
  onBanUser,
  onUnbanUser,
  disabled = false,
}) {
  const [confirming, setConfirming] = useState(false);
  const [banForm, setBanForm] = useState({ groupId: '', userId: '', reason: '' });
  const [banError, setBanError] = useState('');
  const targetLabel = TARGET_LABELS[report.targetType] || `Type ${report.targetType}`;
  const statusLabel = STATUS_LABELS[report.status] || `Status ${report.status}`;
  const isResolved = Number(report.status) === 3;
  const isRejected = Number(report.status) === 4;
  const isActionLocked = disabled || confirming || isResolved || isRejected;
  const isGroupRelated = useMemo(() => [2, 3].includes(Number(report.targetType)), [report.targetType]);

  const handleAction = async (status, label) => {
    if (isActionLocked) return;
    const message = `Are you sure you want to mark this report as ${label}?`;
    if (!window.confirm(message)) return;
    setConfirming(true);
    try {
      await onUpdateStatus(report.id, status);
    } finally {
      setConfirming(false);
    }
  };

  const handleBan = async () => {
    if (!onBanUser) return;
    const groupId = banForm.groupId.trim();
    const userId = banForm.userId.trim();
    const reason = banForm.reason.trim();
    if (!groupId || !userId) {
      setBanError('Group ID and user ID are required to ban.');
      return;
    }
    setBanError('');
    await onBanUser({ groupId, userId, reason: reason || undefined });
  };

  const handleUnban = async () => {
    if (!onUnbanUser) return;
    const groupId = banForm.groupId.trim();
    const userId = banForm.userId.trim();
    if (!groupId || !userId) {
      setBanError('Group ID and user ID are required to unban.');
      return;
    }
    setBanError('');
    await onUnbanUser({ groupId, userId });
  };

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>Report</h3>
          <p className={styles.subtitle}>
            {targetLabel} • <span className="font-medium">ID</span> {report.id}
          </p>
        </div>
        <span className={styles.chip}>{statusLabel}</span>
      </header>

      <p className={styles.meta}>
        Reporter: <code>{report.reporterId}</code>
      </p>
      <p className={styles.meta}>
        Target: <code>{report.targetId}</code>
      </p>
      <p className={styles.meta}>
        Created: {formatDate(report.createdAt)}
      </p>
      <p className="text-sm text-[var(--text-secondary)]">{report.reason}</p>

      <div className={styles.actions}>
        <button
          className={styles.button}
          type="button"
          disabled={isActionLocked || isResolved}
          onClick={() => handleAction(3, 'resolved')}
        >
          Mark as Resolved
        </button>
        <button
          className={styles.button}
          type="button"
          disabled={isActionLocked || isRejected}
          onClick={() => handleAction(4, 'rejected')}
        >
          Mark as Rejected
        </button>
      </div>

      {isGroupRelated ? (
        <div className={styles.banSection}>
          <p className={styles.meta}>Group ban controls (for group-related reports)</p>
          <div className={styles.banRow}>
            <input
              className={styles.input}
              placeholder="Group ID"
              value={banForm.groupId}
              onChange={(e) => setBanForm((prev) => ({ ...prev, groupId: e.target.value }))}
            />
            <input
              className={styles.input}
              placeholder="User ID"
              value={banForm.userId}
              onChange={(e) => setBanForm((prev) => ({ ...prev, userId: e.target.value }))}
            />
            <input
              className={styles.input}
              placeholder="Reason (optional)"
              value={banForm.reason}
              onChange={(e) => setBanForm((prev) => ({ ...prev, reason: e.target.value }))}
            />
            <button
              className={styles.button}
              type="button"
              disabled={disabled}
              onClick={handleBan}
            >
              Ban user (group)
            </button>
            <button
              className={styles.button}
              type="button"
              disabled={disabled}
              onClick={handleUnban}
            >
              Unban user
            </button>
          </div>
          {banError ? <p className={styles.error}>{banError}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

export default ModerationReportRow;
