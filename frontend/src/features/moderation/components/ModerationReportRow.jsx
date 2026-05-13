import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import Dialog from '../../../shared/ui/Dialog';
import Textarea from '../../../shared/ui/Textarea';
import { STATUS_LABELS, STATUS_TONES } from '../moderationLabels';

const STATUS_ACTIONS = [
  { status: 2, label: 'Mark In Review', icon: ShieldAlert },
  { status: 3, label: 'Resolve', icon: CheckCircle2 },
  { status: 4, label: 'Reject', icon: XCircle, variant: 'danger' },
  { status: 5, label: 'Escalate to Admin', icon: AlertTriangle },
];

function ModerationReportRow({
  report,
  onUpdateStatus,
  onRemoveTarget,
  disabled = false,
}) {
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingRemove, setPendingRemove] = useState(false);
  const [note, setNote] = useState('');
  const [working, setWorking] = useState(false);

  const removeAvailable = Boolean(report.targetActions?.canRemoveTarget);
  const removeReason = report.targetActions?.removeUnavailableReason || 'This target type is unavailable for moderation queue removal.';

  const confirmStatusAction = async () => {
    if (!pendingStatus) return;
    setWorking(true);
    try {
      await onUpdateStatus(report.id, pendingStatus.status, note);
      setPendingStatus(null);
      setNote('');
    } finally {
      setWorking(false);
    }
  };

  const confirmRemoveTarget = async () => {
    setWorking(true);
    try {
      await onRemoveTarget(report.id, note);
      setPendingRemove(false);
      setNote('');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="moderation-row-actions" aria-label={`Actions for report ${report.id}`}>
      {STATUS_ACTIONS.map((action) => {
        const Icon = action.icon;
        const isCurrentStatus = Number(report.status) === action.status;
        return (
          <Button
            key={action.status}
            size="sm"
            variant={action.variant || 'default'}
            disabled={disabled || working || isCurrentStatus}
            onClick={() => setPendingStatus(action)}
          >
            <Icon size={14} aria-hidden="true" />
            {action.label}
          </Button>
        );
      })}

      <Button
        size="sm"
        variant="danger"
        disabled={disabled || working || !removeAvailable}
        title={removeAvailable ? 'Remove reported content' : removeReason}
        onClick={() => setPendingRemove(true)}
      >
        <Trash2 size={14} aria-hidden="true" />
        Remove target
      </Button>
      {!removeAvailable ? (
        <p className="moderation-action-note">{removeReason}</p>
      ) : null}

      <Dialog
        open={Boolean(pendingStatus)}
        title="Update report status?"
        description={pendingStatus ? `${pendingStatus.label} for this report.` : undefined}
        onClose={() => {
          if (!working) {
            setPendingStatus(null);
            setNote('');
          }
        }}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setPendingStatus(null)} disabled={working}>Cancel</Button>
            <Button variant="primary" onClick={confirmStatusAction} disabled={working}>
              {working ? 'Updating...' : 'Update status'}
            </Button>
          </>
        )}
      >
        <label className="staff-field">
          <span className="staff-label">Moderation note</span>
          <Textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note or reason"
            maxLength={1000}
          />
        </label>
      </Dialog>

      <Dialog
        open={pendingRemove}
        title="Remove reported target?"
        description="This destructive action removes the supported UGC target and writes an audit log."
        onClose={() => {
          if (!working) {
            setPendingRemove(false);
            setNote('');
          }
        }}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setPendingRemove(false)} disabled={working}>Cancel</Button>
            <Button variant="danger" onClick={confirmRemoveTarget} disabled={working}>
              {working ? 'Removing...' : 'Remove target'}
            </Button>
          </>
        )}
      >
        <label className="staff-field">
          <span className="staff-label">Reason</span>
          <Textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional removal reason"
            maxLength={1000}
          />
        </label>
      </Dialog>
    </div>
  );
}

export function ReportStatusBadge({ status }) {
  return (
    <Badge tone={STATUS_TONES[status] || 'neutral'}>
      {STATUS_LABELS[status] || `Status ${status}`}
    </Badge>
  );
}

export default ModerationReportRow;
