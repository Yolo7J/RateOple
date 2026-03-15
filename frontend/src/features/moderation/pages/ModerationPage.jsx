import { useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useModerationReportsQuery } from '../queries/useModerationReportsQuery';
import { useModeratorAssignmentsQuery } from '../queries/useModeratorAssignmentsQuery';
import { useModerationMutations } from '../queries/useModerationMutations';
import ModerationReportRow from '../components/ModerationReportRow';
import ModeratorAssignmentList from '../components/ModeratorAssignmentList';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';

const styles = {
  pageStack: 'gap-6',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  muted: 'text-[var(--text-muted)]',
  error: 'text-[#ff7f7f]',
  section: [
    'rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]',
    'p-4 sm:p-6',
  ].join(' '),
  sectionTitle: 'text-xl font-semibold',
  filters: 'flex flex-wrap items-center gap-3',
  select: [
    'min-w-[150px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-sm text-[var(--text-primary)]',
  ].join(' '),
  form: 'flex flex-wrap items-center gap-3',
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
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <h1 className={styles.title}>Moderation</h1>

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

              {reportsLoading ? <p className={styles.muted}>Loading reports...</p> : null}
              {reportsError ? <p className={styles.error}>Failed to load reports.</p> : null}
              {actionError ? <p className={styles.error}>{actionError}</p> : null}

              {!reportsLoading && !reportsError ? (
                <Grid cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" className={styles.grid}>
                  {reports.map((report) => (
                    <ModerationReportRow
                      key={`${report.id}-${report.status}`}
                      report={report}
                      onUpdateStatus={handleUpdateStatus}
                      disabled={mutating}
                    />
                  ))}
                  {reports.length === 0 ? <p className={styles.muted}>No reports found.</p> : null}
                </Grid>
              ) : null}
            </Stack>
          </section>

          {isAdmin ? (
            <section className={styles.section}>
              <Stack className="gap-4">
                <h2 className={styles.sectionTitle}>Moderator assignments</h2>
                <form className={styles.form} onSubmit={handleCreateAssignment}>
                  <input
                    className={styles.input}
                    placeholder="User ID"
                    value={assignmentForm.userId}
                    onChange={(e) => setAssignmentForm((prev) => ({ ...prev, userId: e.target.value }))}
                    required
                  />
                  <select
                    className={styles.select}
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
                    className={styles.input}
                    placeholder="Scope ID (optional for Global)"
                    value={assignmentForm.scopeId}
                    onChange={(e) => setAssignmentForm((prev) => ({ ...prev, scopeId: e.target.value }))}
                  />
                  <button className={styles.button} type="submit" disabled={mutating}>
                    Assign moderator
                  </button>
                </form>

                {assignmentsLoading ? <p className={styles.muted}>Loading assignments...</p> : null}
                {assignmentsError ? <p className={styles.error}>Failed to load assignments.</p> : null}

                {!assignmentsLoading && !assignmentsError ? (
                  <ModeratorAssignmentList
                    assignments={assignments}
                    onRemove={handleRemoveAssignment}
                    disabled={mutating}
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
