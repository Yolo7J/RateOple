import { useCallback, useMemo, useState } from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useModerationReportsQuery } from '../queries/useModerationReportsQuery';
import { useModeratorAssignmentsQuery } from '../queries/useModeratorAssignmentsQuery';
import { useModerationMutations } from '../queries/useModerationMutations';
import { useGroupMutations } from '../../groups/queries/useGroupMutations';
import { useModerationRealtime } from '../realtime/useModerationRealtime';
import ModerationReportRow from '../components/ModerationReportRow';
import ModeratorAssignmentList from '../components/ModeratorAssignmentList';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import Badge from '../../../shared/ui/Badge';
import { EntityPicker } from '../../../shared/ui/EntityPicker';
import { searchModeratorCandidates } from '../../users/services/userLookupService';
import { searchModerationScopes } from '../services/scopeLookupService';
import '../moderation.css';

const REPORT_STATUS_OPTIONS = [
  { value: '', label: 'All' },
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
  const hasModerationAccess = roles.some((role) => ['Admin', 'SuperAdmin', 'Moderator'].includes(role));

  const [statusFilter, setStatusFilter] = useState('1');
  const [assignmentForm, setAssignmentForm] = useState({ scopeType: '1' });
  const [assignmentUser, setAssignmentUser] = useState(null);
  const [assignmentScope, setAssignmentScope] = useState(null);
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

  const { updateReportStatus, createAssignment, removeAssignment, loading: moderationMutating } = useModerationMutations();
  const { banUser, unbanUser, loading: groupMutating } = useGroupMutations();
  const isMutating = moderationMutating || groupMutating;

  useModerationRealtime(hasModerationAccess);

  const reports = Array.isArray(reportsData?.items) ? reportsData.items : [];
  const assignments = Array.isArray(assignmentsData) ? assignmentsData : [];
  const currentStatusLabel = REPORT_STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? 'Reports';

  const searchAssignmentScope = useCallback((params) => (
    searchModerationScopes({ ...params, scopeType: Number(assignmentForm.scopeType) })
  ), [assignmentForm.scopeType]);

  const searchAssignmentUser = useCallback((params) => (
    searchModeratorCandidates({
      ...params,
      scopeType: Number(assignmentForm.scopeType),
      ...(assignmentForm.scopeType === '1' ? {} : { scopeId: assignmentScope?.id }),
    })
  ), [assignmentForm.scopeType, assignmentScope?.id]);

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
    if (!assignmentUser?.id) return;
    if (assignmentForm.scopeType !== '1' && !assignmentScope?.id) {
      setActionError('Select a scope for non-global assignments.');
      return;
    }

    setActionError('');
    try {
      await createAssignment({
        userId: assignmentUser.id,
        scopeType: Number(assignmentForm.scopeType),
        ...(assignmentForm.scopeType === '1'
          ? {}
          : { scopeId: assignmentScope.id }),
      });

      setAssignmentUser(null);
      setAssignmentScope(null);
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

  const handleBanUser = async ({ groupId, userId, reason }) => {
    setActionError('');
    try {
      await banUser(groupId, { userId, ...(reason ? { reason } : {}) });
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not ban user from group.');
      throw err;
    }
  };

  const handleUnbanUser = async ({ groupId, userId }) => {
    setActionError('');
    try {
      await unbanUser(groupId, userId);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not unban user from group.');
      throw err;
    }
  };

  return (
    <PageLayout>
      <Container size="xxl">
        <div className="moderation-workspace">
          <header className="moderation-hero">
            <p className="staff-eyebrow">Staff operations</p>
            <h1 className="moderation-hero__title">Moderation queue</h1>
            <p className="moderation-hero__copy">
              Review reports, triage status changes, and manage moderator coverage without leaving the admin workspace.
            </p>
            <div className="staff-hero__meta mt-4">
              <Badge tone="accent">{currentStatusLabel}</Badge>
              <Badge>{reportsData?.totalCount ?? reports.length} reports</Badge>
              {isAdmin ? <Badge tone="info">{assignments.length} assignments</Badge> : null}
            </div>
          </header>

          <section className="moderation-section" aria-labelledby="reports-title">
            <header className="moderation-section__header">
              <div>
                <h2 className="moderation-section__title" id="reports-title">Reports</h2>
                <p className="moderation-section__copy">Filter the queue and apply the supported report status mutations.</p>
              </div>
              <div className="moderation-tabs" role="tablist" aria-label="Report status filters">
                {REPORT_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value || 'all'}
                    type="button"
                    className={option.value === statusFilter ? 'moderation-tab moderation-tab--active' : 'moderation-tab'}
                    onClick={() => setStatusFilter(option.value)}
                    aria-pressed={option.value === statusFilter}
                    disabled={reportsLoading}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </header>

            {reportsLoading ? <LoadingState label="Loading reports..." /> : null}
            {reportsError ? <InlineMessage tone="error">Failed to load reports.</InlineMessage> : null}
            {isMutating ? <InlineMessage tone="info">Applying moderation changes...</InlineMessage> : null}
            {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}

            {!reportsLoading && !reportsError ? (
              reports.length > 0 ? (
                <div className="moderation-report-grid">
                  {reports.map((report) => (
                    <ModerationReportRow
                      key={`${report.id}-${report.status}`}
                      report={report}
                      onUpdateStatus={handleUpdateStatus}
                      onBanUser={handleBanUser}
                      onUnbanUser={handleUnbanUser}
                      disabled={isMutating}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="No reports found" />
              )
            ) : null}
          </section>

          {isAdmin ? (
            <section className="moderation-section" aria-labelledby="assignments-title">
              <header className="moderation-section__header">
                <div>
                  <h2 className="moderation-section__title" id="assignments-title">Moderator assignments</h2>
                  <p className="moderation-section__copy">Grant or remove moderator coverage for supported scopes.</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
              </header>

              <form className="moderation-assignment-form" onSubmit={handleCreateAssignment}>
                <EntityPicker
                  label="Moderator"
                  placeholder="Search users by name, username, or email"
                  value={assignmentUser}
                  onChange={setAssignmentUser}
                  searchFn={searchAssignmentUser}
                  disabled={isMutating || (assignmentForm.scopeType !== '1' && !assignmentScope)}
                />
                <label className="staff-field">
                  <span className="staff-label">Scope type</span>
                  <Select
                    value={assignmentForm.scopeType}
                    onChange={(e) => {
                      setAssignmentForm((prev) => ({ ...prev, scopeType: e.target.value }));
                      setAssignmentScope(null);
                      setAssignmentUser(null);
                    }}
                  >
                    {SCOPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>
                {assignmentForm.scopeType !== '1' ? (
                  <EntityPicker
                    label={`${SCOPE_OPTIONS.find((option) => option.value === assignmentForm.scopeType)?.label ?? 'Scope'} scope`}
                    placeholder="Search scope by name"
                    value={assignmentScope}
                    onChange={(scope) => {
                      setAssignmentScope(scope);
                      setAssignmentUser(null);
                    }}
                    searchFn={searchAssignmentScope}
                    disabled={isMutating}
                  />
                ) : (
                  <p className="moderation-muted">Global assignments apply across all moderation scopes.</p>
                )}
                {assignmentForm.scopeType !== '1' && !assignmentScope ? (
                  <InlineMessage tone="info">Select a scope before choosing a moderator candidate.</InlineMessage>
                ) : null}
                {assignmentUser ? (
                  <p className="moderation-muted">
                    Assign {assignmentUser.label} as moderator for{' '}
                    {assignmentForm.scopeType === '1' ? 'Global' : assignmentScope?.label ?? 'selected scope'}.
                  </p>
                ) : null}
                <div className="moderation-card-actions">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isMutating || !assignmentUser || (assignmentForm.scopeType !== '1' && !assignmentScope)}
                  >
                    <UserPlus size={16} aria-hidden="true" />
                    Assign moderator
                  </Button>
                </div>
              </form>

              {assignmentsLoading ? <LoadingState label="Loading assignments..." /> : null}
              {assignmentsError ? <InlineMessage tone="error">Failed to load assignments.</InlineMessage> : null}

              {!assignmentsLoading && !assignmentsError ? (
                <ModeratorAssignmentList
                  assignments={assignments}
                  onRemove={handleRemoveAssignment}
                  disabled={isMutating}
                />
              ) : null}
            </section>
          ) : null}
        </div>
      </Container>
    </PageLayout>
  );
}

export default ModerationPage;
