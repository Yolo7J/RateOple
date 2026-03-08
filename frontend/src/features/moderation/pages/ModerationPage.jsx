import { useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useModerationReportsQuery } from '../queries/useModerationReportsQuery';
import { useModeratorAssignmentsQuery } from '../queries/useModeratorAssignmentsQuery';
import { useModerationMutations } from '../queries/useModerationMutations';
import ModerationReportRow from '../components/ModerationReportRow';
import ModeratorAssignmentList from '../components/ModeratorAssignmentList';
import '../components/moderation.css';
import '../../../pages/pages.css';

const REPORT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: '1', label: 'Pending' },
  { value: '2', label: 'In review' },
  { value: '3', label: 'Resolved' },
  { value: '4', label: 'Rejected' },
];

const SCOPE_OPTIONS = [
  { value: '1', label: 'Global' },
  { value: '2', label: 'Group' },
  { value: '3', label: 'Collection' },
  { value: '4', label: 'Media' },
];

function ModerationPage() {
  const { user } = useAuth();
  const roles = useMemo(() => (Array.isArray(user?.roles) ? user.roles : []), [user]);
  const isAdmin = roles.some((role) => ['Admin', 'SuperAdmin'].includes(role));

  const [statusFilter, setStatusFilter] = useState('1');
  const [assignmentForm, setAssignmentForm] = useState({ userId: '', scopeType: '1', scopeId: '' });
  const [actionError, setActionError] = useState('');

  const { data: reportsData, loading: reportsLoading, error: reportsError } = useModerationReportsQuery({
    page: 1,
    pageSize: 50,
    ...(statusFilter ? { status: Number(statusFilter) } : {}),
  });

  const {
    data: assignmentsData,
    loading: assignmentsLoading,
    error: assignmentsError,
  } = useModeratorAssignmentsQuery({}, isAdmin);

  const { updateReportStatus, createAssignment, removeAssignment, loading: mutating } = useModerationMutations();

  const reports = Array.isArray(reportsData?.items) ? reportsData.items : [];
  const assignments = Array.isArray(assignmentsData) ? assignmentsData : [];

  const handleUpdateStatus = async (reportId, nextStatus) => {
    setActionError('');
    try {
      await updateReportStatus(reportId, Number(nextStatus));
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not update report status.');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentForm.userId.trim()) return;

    setActionError('');
    try {
      await createAssignment({
        userId: assignmentForm.userId.trim(),
        scopeType: Number(assignmentForm.scopeType),
        ...(assignmentForm.scopeType === '1' || !assignmentForm.scopeId.trim()
          ? {}
          : { scopeId: assignmentForm.scopeId.trim() }),
      });

      setAssignmentForm((prev) => ({ ...prev, userId: '', scopeId: '' }));
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not assign moderator.');
    }
  };

  const handleRemoveAssignment = async (payload) => {
    setActionError('');
    try {
      await removeAssignment(payload);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not remove assignment.');
    }
  };

  return (
    <main className="ro-page">
      <h1>Moderation</h1>

      <section className="ro-review-section">
        <h2>Reports</h2>
        <div className="ro-moderation-filters">
          <label htmlFor="report-status">Status:</label>
          <select
            id="report-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={reportsLoading}
          >
            {REPORT_STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {reportsLoading ? <p>Loading reports...</p> : null}
        {reportsError ? <p className="ro-error">Failed to load reports.</p> : null}
        {actionError ? <p className="ro-error">{actionError}</p> : null}

        {!reportsLoading && !reportsError ? (
          <div className="ro-moderation-grid">
            {reports.map((report) => (
              <ModerationReportRow
                key={`${report.id}-${report.status}`}
                report={report}
                onUpdateStatus={handleUpdateStatus}
                disabled={mutating}
              />
            ))}
            {reports.length === 0 ? <p className="ro-muted">No reports found.</p> : null}
          </div>
        ) : null}
      </section>

      {isAdmin ? (
        <section className="ro-review-section">
          <h2>Moderator assignments</h2>
          <form className="ro-assignment-form" onSubmit={handleCreateAssignment}>
            <input
              placeholder="User ID"
              value={assignmentForm.userId}
              onChange={(e) => setAssignmentForm((prev) => ({ ...prev, userId: e.target.value }))}
              required
            />
            <select
              value={assignmentForm.scopeType}
              onChange={(e) => setAssignmentForm((prev) => ({ ...prev, scopeType: e.target.value }))}
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              placeholder="Scope ID (optional for Global)"
              value={assignmentForm.scopeId}
              onChange={(e) => setAssignmentForm((prev) => ({ ...prev, scopeId: e.target.value }))}
            />
            <button type="submit" disabled={mutating}>Assign moderator</button>
          </form>

          {assignmentsLoading ? <p>Loading assignments...</p> : null}
          {assignmentsError ? <p className="ro-error">Failed to load assignments.</p> : null}

          {!assignmentsLoading && !assignmentsError ? (
            <ModeratorAssignmentList
              assignments={assignments}
              onRemove={handleRemoveAssignment}
              disabled={mutating}
            />
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

export default ModerationPage;
