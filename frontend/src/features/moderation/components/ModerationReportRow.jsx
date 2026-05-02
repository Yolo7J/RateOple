import { useCallback, useMemo, useState } from 'react';
import { formatDate } from '../../../shared/utils/formatDate';
import { EntityPicker } from '../../../shared/ui/EntityPicker';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import Dialog from '../../../shared/ui/Dialog';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
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
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingBanAction, setPendingBanAction] = useState(null);
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
    setPendingStatus({ status, label });
  };

  const confirmStatusAction = async () => {
    if (!pendingStatus) return;
    setConfirming(true);
    try {
      await onUpdateStatus(report.id, pendingStatus.status);
      setPendingStatus(null);
    } finally {
      setConfirming(false);
    }
  };

  const handleBan = async () => {
    if (!onBanUser) return;
    if (!banForm.group?.id || !banForm.user?.id) {
      setBanError('Select a group and user to ban.');
      return;
    }
    setPendingBanAction('ban');
  };

  const confirmBanAction = async () => {
    if (!pendingBanAction) return;
    setBanError('');
    setBanPending(true);
    try {
      if (pendingBanAction === 'ban') {
        const reason = banForm.reason.trim();
        await onBanUser({ groupId: banForm.group.id, userId: banForm.user.id, reason: reason || undefined });
      } else {
        await onUnbanUser({ groupId: banForm.group.id, userId: banForm.user.id });
      }
      setPendingBanAction(null);
    } catch (err) {
      setBanError(err?.response?.data?.message || `Could not ${pendingBanAction} user.`);
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
    setPendingBanAction('unban');
  };

  return (
    <>
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
            <Input
              className="min-w-[180px]"
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
    <Dialog
      open={Boolean(pendingStatus)}
      title="Update report status?"
      description={`Mark this report as ${pendingStatus?.label}?`}
      onClose={() => {
        if (!confirming) setPendingStatus(null);
      }}
      actions={(
        <>
          <Button variant="ghost" onClick={() => setPendingStatus(null)} disabled={confirming}>Cancel</Button>
          <Button variant="primary" onClick={confirmStatusAction} disabled={confirming}>
            {confirming ? 'Updating...' : 'Update status'}
          </Button>
        </>
      )}
    />
    <Dialog
      open={Boolean(pendingBanAction)}
      title={pendingBanAction === 'ban' ? 'Ban user from group?' : 'Unban user from group?'}
      description={`${pendingBanAction === 'ban' ? 'Ban' : 'Unban'} ${banForm.user?.label || 'this user'} from ${banForm.group?.label || 'this group'}?`}
      onClose={() => {
        if (!banPending) setPendingBanAction(null);
      }}
      actions={(
        <>
          <Button variant="ghost" onClick={() => setPendingBanAction(null)} disabled={banPending}>Cancel</Button>
          <Button
            variant={pendingBanAction === 'ban' ? 'danger' : 'primary'}
            onClick={confirmBanAction}
            disabled={banPending}
          >
            {banPending ? 'Processing...' : pendingBanAction === 'ban' ? 'Ban user' : 'Unban user'}
          </Button>
        </>
      )}
    >
      {pendingBanAction === 'ban' && banForm.reason.trim() ? (
        <p className="text-sm text-[var(--text-muted)]">Reason: {banForm.reason.trim()}</p>
      ) : null}
    </Dialog>
    </>
  );
}

export default ModerationReportRow;
