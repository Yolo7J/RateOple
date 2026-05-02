import { useCallback, useMemo, useState } from 'react';
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
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import PageHeader from '../../../shared/ui/PageHeader';
import { EntityPicker } from '../../../shared/ui/EntityPicker';
import { searchModerationUsers } from '../../users/services/userLookupService';
import { searchModerationScopes } from '../services/scopeLookupService';

const styles = {
  pageStack: 'gap-6',
  muted: 'text-[var(--text-muted)]',
  section: 'ui-card p-4 sm:p-6',
  sectionTitle: 'ui-section-title',
  filters: 'flex flex-wrap items-center gap-3',
  select: [
    'min-w-[150px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-sm text-[var(--text-primary)]',
  ].join(' '),
  form: 'grid gap-3 max-w-2xl',
  input: [
    'min-w-[150px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  ].join(' '),
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
  grid: 'gap-3',
};

const REPORT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: '1', label: 'Pending' },
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

  const searchAssignmentScope = useCallback((params) => (
    searchModerationScopes({ ...params, scopeType: Number(assignmentForm.scopeType) })
  ), [assignmentForm.scopeType]);

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
      <Container>
        <Stack className={styles.pageStack}>
          <PageHeader title="Moderation" subtitle="Review reports, assignments, and realtime moderation events." />

          <section className={styles.section}>
            <Stack className="gap-4">
              <h2 className={styles.sectionTitle}>Reports</h2>
              <div className={styles.filters}>
                <label htmlFor="report-status" className="text-sm text-[var(--text-secondary)]">Status:</label>
                <select
                  className={styles.select}
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

              {reportsLoading ? <LoadingState label="Loading reports..." /> : null}
              {reportsError ? <InlineMessage tone="error">Failed to load reports.</InlineMessage> : null}
              {isMutating ? <InlineMessage tone="info">Applying moderation changes...</InlineMessage> : null}
              {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}

              {!reportsLoading && !reportsError ? (
                <Grid cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" className={styles.grid}>
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
                  {reports.length === 0 ? <EmptyState title="No reports found" /> : null}
                </Grid>
              ) : null}
            </Stack>
          </section>

          {isAdmin ? (
            <section className={styles.section}>
              <Stack className="gap-4">
                <h2 className={styles.sectionTitle}>Moderator assignments</h2>
                <form className={styles.form} onSubmit={handleCreateAssignment}>
                  <EntityPicker
                    label="Moderator"
                    placeholder="Search users by name, username, or email"
                    value={assignmentUser}
                    onChange={setAssignmentUser}
                    searchFn={searchModerationUsers}
                    disabled={isMutating}
                  />
                  <select
                    className={styles.select}
                    value={assignmentForm.scopeType}
                    onChange={(e) => {
                      setAssignmentForm((prev) => ({ ...prev, scopeType: e.target.value }));
                      setAssignmentScope(null);
                    }}
                  >
                    {SCOPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {assignmentForm.scopeType !== '1' ? (
                    <EntityPicker
                      label={`${SCOPE_OPTIONS.find((option) => option.value === assignmentForm.scopeType)?.label ?? 'Scope'} scope`}
                      placeholder="Search scope by name"
                      value={assignmentScope}
                      onChange={setAssignmentScope}
                      searchFn={searchAssignmentScope}
                      disabled={isMutating}
                    />
                  ) : (
                    <p className={styles.muted}>Global assignments apply across all moderation scopes.</p>
                  )}
                  {assignmentUser ? (
                    <p className={styles.muted}>
                      Assign {assignmentUser.label} as moderator for{' '}
                      {assignmentForm.scopeType === '1' ? 'Global' : assignmentScope?.label ?? 'selected scope'}.
                    </p>
                  ) : null}
                  <button
                    className={styles.button}
                    type="submit"
                    disabled={isMutating || !assignmentUser || (assignmentForm.scopeType !== '1' && !assignmentScope)}
                  >
                    Assign moderator
                  </button>
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
              </Stack>
            </section>
          ) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default ModerationPage;
