import { useState } from 'react';
import { useModerationAuditLogsQuery } from '../queries/useModerationAuditLogsQuery';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import PageHeader from '../../../shared/ui/PageHeader';

const styles = {
  pageStack: 'gap-6',
  muted: 'text-[var(--text-muted)]',
  section: 'ui-card p-4 sm:p-6',
  sectionTitle: 'ui-section-title',
  filters: 'flex flex-wrap items-center gap-3',
  select: [
    'min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-sm text-[var(--text-primary)]',
  ].join(' '),
  card: 'ui-card flex flex-col gap-2 p-4',
  cardTitle: 'text-base font-semibold text-[var(--text-primary)]',
  meta: 'text-sm text-[var(--text-muted)]',
  grid: 'gap-3',
};

const ACTION_LABELS = {
  1: 'Report marked pending',
  2: 'Report marked in review',
  3: 'Report resolved',
  4: 'Report rejected',
  5: 'Moderator assigned',
  6: 'Moderator unassigned',
  7: 'Group user banned',
  8: 'Group user unbanned',
};

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: '1', label: 'Report marked pending' },
  { value: '2', label: 'Report marked in review' },
  { value: '3', label: 'Report resolved' },
  { value: '4', label: 'Report rejected' },
  { value: '5', label: 'Moderator assigned' },
  { value: '6', label: 'Moderator unassigned' },
  { value: '7', label: 'Group user banned' },
  { value: '8', label: 'Group user unbanned' },
];

const SCOPE_LABELS = {
  1: 'Global',
  2: 'Group',
  3: 'Collection',
  4: 'Media',
};

function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState('');

  const { data, loading, error } = useModerationAuditLogsQuery({
    page: 1,
    pageSize: 50,
    ...(actionFilter ? { action: Number(actionFilter) } : {}),
  });

  const logs = Array.isArray(data?.items) ? data.items : [];

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <PageHeader title="Audit Logs" subtitle="Trace moderation actions across reports, assignments, and scopes." />

          <section className={styles.section}>
            <Stack className="gap-4">
              <h2 className={styles.sectionTitle}>Moderation activity</h2>
              <div className={styles.filters}>
                <label htmlFor="audit-action" className="text-sm text-[var(--text-secondary)]">Action:</label>
                <select
                  className={styles.select}
                  id="audit-action"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  disabled={loading}
                >
                  {ACTION_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? <LoadingState label="Loading audit logs..." /> : null}
              {error ? <InlineMessage tone="error">Failed to load audit logs.</InlineMessage> : null}

              {!loading && !error ? (
                <Grid cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" className={styles.grid}>
                  {logs.map((log) => (
                    <article key={log.id} className={styles.card}>
                      <h3 className={styles.cardTitle}>
                        {ACTION_LABELS[log.action] || `Action ${log.action}`}
                      </h3>
                      <p className={styles.meta}>
                        Moderator: {log.performedByDisplayName || 'Unknown user'}
                      </p>
                      <p className={styles.meta}>
                        Target: {log.targetDisplayName || '—'}
                      </p>
                      {log.scopeType ? (
                        <p className={styles.meta}>
                          Scope: {log.scopeName || SCOPE_LABELS[log.scopeType] || log.scopeType}
                        </p>
                      ) : null}
                      {log.notes ? (
                        <p className={styles.meta}>Notes: {log.notes}</p>
                      ) : null}
                      <p className={styles.meta}>
                        Date: {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </article>
                  ))}
                  {logs.length === 0 ? <EmptyState title="No audit logs found" /> : null}
                </Grid>
              ) : null}
            </Stack>
          </section>
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default AuditLogPage;
