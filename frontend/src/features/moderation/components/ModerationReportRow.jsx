import { useCallback, useMemo, useState } from 'react';
import { formatDate } from '../../../shared/utils/formatDate';
import { EntityPicker } from '../../../shared/ui/EntityPicker';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import InlineMessage from '../../../shared/ui/InlineMessage';
import { searchModerationUsers } from '../../users/services/userLookupService';
import { searchModerationScopes } from '../services/scopeLookupService';

const styles = {
  card: 'ui-card flex flex-col gap-2 p-4',
  highlight: 'live-highlight',
  header: 'flex flex-wrap items-center justify-between gap-2',
  title: 'text-base font-semibold text-[var(--text-primary)]',
  subtitle: 'text-sm text-[var(--text-muted)]',
  meta: 'text-sm text-[var(--text-muted)]',
  actions: 'flex flex-wrap items-center gap-2',
  input: [
    'min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  ].join(' '),
  banSection: 'mt-2 grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3',
  banRow: 'grid gap-3',
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
  const updatedAtValue = report.updatedAt || report.createdAt;
  const updatedAtMs = updatedAtValue ? new Date(updatedAtValue).getTime() : 0;
  const isRecent = Number.isFinite(updatedAtMs) && Date.now() - updatedAtMs < 60000;
  const [confirming, setConfirming] = useState(false);
  const [banForm, setBanForm] = useState({ group: null, user: null, reason: '' });
  const [banError, setBanError] = useState('');
  const [banPending, setBanPending] = useState(false);
  const targetLabel = TARGET_LABELS[report.targetType] || `Type ${report.targetType}`;
  const targetDisplay = report.targetDisplayName || targetLabel;
  const reporterDisplay = report.reporterDisplayName || 'Unknown user';
  const statusLabel = STATUS_LABELS[report.status] || `Status ${report.status}`;
  const isResolved = Number(report.status) === 3;
  const isRejected = Number(report.status) === 4;
  const isActionLocked = disabled || confirming || isResolved || isRejected;
  const isGroupRelated = useMemo(() => [2, 3].includes(Number(report.targetType)), [report.targetType]);
  const searchGroups = useCallback((params) => (
    searchModerationScopes({ ...params, scopeType: 2 })
  ), []);

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
    const reason = banForm.reason.trim();
    if (!banForm.group?.id || !banForm.user?.id) {
      setBanError('Select a group and user to ban.');
      return;
    }
    if (!window.confirm(`Ban ${banForm.user.label} from ${banForm.group.label}?`)) return;
    setBanError('');
    setBanPending(true);
    try {
      await onBanUser({ groupId: banForm.group.id, userId: banForm.user.id, reason: reason || undefined });
    } catch (err) {
      setBanError(err?.response?.data?.message || 'Could not ban user from group.');
    } finally {
      setBanPending(false);
    }
  };

  const handleUnban = async () => {
    if (!onUnbanUser) return;
    if (!banForm.group?.id || !banForm.user?.id) {
      setBanError('Select a group and user to unban.');
      return;
    }
    if (!window.confirm(`Unban ${banForm.user.label} from ${banForm.group.label}?`)) return;
    setBanError('');
    setBanPending(true);
    try {
      await onUnbanUser({ groupId: banForm.group.id, userId: banForm.user.id });
    } catch (err) {
      setBanError(err?.response?.data?.message || 'Could not unban user from group.');
    } finally {
      setBanPending(false);
    }
  };

  return (
    <article className={`${styles.card} ${isRecent ? styles.highlight : ''}`}>
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>Report</h3>
          <p className={styles.subtitle}>
            {targetDisplay}
          </p>
        </div>
        <Badge tone={isResolved ? 'success' : isRejected ? 'danger' : 'warning'}>{statusLabel}</Badge>
      </header>

      <p className={styles.meta}>
        Reporter: {reporterDisplay}
      </p>
      <p className={styles.meta}>
        Target: {targetDisplay}
      </p>
      <p className={styles.meta}>
        Created: {formatDate(report.createdAt)}
      </p>
      <p className="text-sm text-[var(--text-secondary)]">{report.reason}</p>

      <div className={styles.actions}>
        <Button
          size="sm"
          disabled={isActionLocked || isResolved}
          onClick={() => handleAction(3, 'resolved')}
        >
          Mark as Resolved
        </Button>
        <Button
          size="sm"
          disabled={isActionLocked || isRejected}
          onClick={() => handleAction(4, 'rejected')}
        >
          Mark as Rejected
        </Button>
      </div>

      {isGroupRelated ? (
        <div className={styles.banSection}>
          <p className={styles.meta}>Group ban controls (for group-related reports)</p>
          <div className={styles.banRow}>
            <EntityPicker
              label="Group"
              placeholder="Search groups by name"
              value={banForm.group}
              onChange={(group) => setBanForm((prev) => ({ ...prev, group }))}
              searchFn={searchGroups}
              disabled={disabled || banPending}
            />
            <EntityPicker
              label="User"
              placeholder="Search users by name, username, or email"
              value={banForm.user}
              onChange={(nextUser) => setBanForm((prev) => ({ ...prev, user: nextUser }))}
              searchFn={searchModerationUsers}
              disabled={disabled || banPending}
            />
            <input
              className={styles.input}
              placeholder="Reason (optional)"
              value={banForm.reason}
              onChange={(e) => setBanForm((prev) => ({ ...prev, reason: e.target.value }))}
            />
            <Button
              size="sm"
              disabled={disabled || banPending || !banForm.group || !banForm.user}
              onClick={handleBan}
            >
              {banPending ? 'Processing...' : 'Ban user (group)'}
            </Button>
            <Button
              size="sm"
              disabled={disabled || banPending || !banForm.group || !banForm.user}
              onClick={handleUnban}
            >
              {banPending ? 'Processing...' : 'Unban user'}
            </Button>
          </div>
          {banError ? <InlineMessage tone="error">{banError}</InlineMessage> : null}
        </div>
      ) : null}
    </article>
  );
}

export default ModerationReportRow;
