import { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { formatDate } from '../../../shared/utils/formatDate';
import { EntityPicker } from '../../../shared/ui/EntityPicker';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import Dialog from '../../../shared/ui/Dialog';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import { searchModerationUsers } from '../../users/services/userLookupService';
import { searchModerationScopes } from '../services/scopeLookupService';

const STATUS_LABELS = {
  1: 'Pending',
  2: 'In review',
  3: 'Resolved',
  4: 'Rejected',
};

const STATUS_TONES = {
  1: 'warning',
  2: 'info',
  3: 'success',
  4: 'danger',
};

const TARGET_LABELS = {
  1: 'User',
  2: 'Comment',
  3: 'Post',
  4: 'Review',
};

const Field = ({ label, children }) => (
  <label className="staff-field">
    <span className="staff-label">{label}</span>
    {children}
  </label>
);

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
  const isActionLocked = disabled || confirming;
  const isGroupRelated = useMemo(() => [2, 3].includes(Number(report.targetType)), [report.targetType]);
  const searchGroups = useCallback((params) => (
    searchModerationScopes({ ...params, scopeType: 2 })
  ), []);

  const handleAction = async (status, label) => {
    if (isActionLocked || Number(report.status) === Number(status)) return;
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
      <article className={`moderation-report-card ${isRecent ? 'live-highlight' : ''}`}>
        <header className="moderation-report-card__header">
          <div>
            <h3 className="moderation-report-card__title">{targetLabel} report</h3>
            <p className="moderation-report-card__target">{targetDisplay}</p>
          </div>
          <Badge tone={STATUS_TONES[report.status] || 'neutral'}>{statusLabel}</Badge>
        </header>

        <div className="moderation-meta-grid">
          <div className="moderation-meta-item">
            <span>Reporter</span>
            <span>{reporterDisplay}</span>
          </div>
          <div className="moderation-meta-item">
            <span>Target type</span>
            <span>{targetLabel}</span>
          </div>
          <div className="moderation-meta-item">
            <span>Created</span>
            <span>{formatDate(report.createdAt)}</span>
          </div>
          <div className="moderation-meta-item">
            <span>Updated</span>
            <span>{report.updatedAt ? formatDate(report.updatedAt) : 'Not reviewed'}</span>
          </div>
        </div>

        <p className="moderation-report-reason">{report.reason || 'No reason supplied.'}</p>

        <div className="moderation-card-actions" aria-label={`Actions for ${targetLabel} report`}>
          <Button
            size="sm"
            disabled={isActionLocked || Number(report.status) === 2}
            onClick={() => handleAction(2, 'in review')}
          >
            <ShieldAlert size={14} aria-hidden="true" />
            In review
          </Button>
          <Button
            size="sm"
            disabled={isActionLocked || Number(report.status) === 3}
            onClick={() => handleAction(3, 'resolved')}
          >
            <CheckCircle2 size={14} aria-hidden="true" />
            Resolve
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={isActionLocked || Number(report.status) === 4}
            onClick={() => handleAction(4, 'rejected')}
          >
            <XCircle size={14} aria-hidden="true" />
            Reject
          </Button>
          {[3, 4].includes(Number(report.status)) ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={isActionLocked}
              onClick={() => handleAction(1, 'pending')}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reopen
            </Button>
          ) : null}
        </div>

        {isGroupRelated ? (
          <div className="moderation-ban-panel">
            <div>
              <h4 className="moderation-ban-panel__title">Group membership action</h4>
              <p className="moderation-section__copy">Use only when the report target belongs to a group context.</p>
            </div>
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
            <Field label="Reason">
              <Input
                value={banForm.reason}
                onChange={(e) => setBanForm((prev) => ({ ...prev, reason: e.target.value }))}
              />
            </Field>
            <div className="moderation-danger-actions">
              <Button
                size="sm"
                variant="danger"
                disabled={disabled || banPending || !banForm.group || !banForm.user}
                onClick={handleBan}
              >
                {banPending ? 'Processing...' : 'Ban user'}
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
