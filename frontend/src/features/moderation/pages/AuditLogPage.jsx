import { useState } from 'react';
import { History } from 'lucide-react';
import { useModerationAuditLogsQuery } from '../queries/useModerationAuditLogsQuery';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import Badge from '../../../shared/ui/Badge';
import Select from '../../../shared/ui/Select';
import '../moderation.css';

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
      <Container size="xxl">
        <div className="moderation-workspace">
          <header className="moderation-hero">
            <p className="staff-eyebrow">Staff operations</p>
            <h1 className="moderation-hero__title">Audit logs</h1>
            <p className="moderation-hero__copy">
              Trace moderation decisions, assignment changes, and group actions across supported scopes.
            </p>
            <div className="staff-hero__meta mt-4">
              <Badge tone="accent">{data?.totalCount ?? logs.length} records</Badge>
            </div>
          </header>

          <section className="moderation-section" aria-labelledby="audit-activity-title">
            <header className="moderation-section__header">
              <div>
                <h2 className="moderation-section__title" id="audit-activity-title">Moderation activity</h2>
                <p className="moderation-section__copy">Filter the log without changing any moderation state.</p>
              </div>
              <label className="staff-field min-w-[220px]" htmlFor="audit-action">
                <span className="staff-label">Action</span>
                <Select
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
                </Select>
              </label>
            </header>

            {loading ? <LoadingState label="Loading audit logs..." /> : null}
            {error ? <InlineMessage tone="error">Failed to load audit logs.</InlineMessage> : null}

            {!loading && !error ? (
              logs.length > 0 ? (
                <div className="moderation-audit-grid">
                  {logs.map((log) => (
                    <article key={log.id} className="moderation-audit-card">
                      <header className="moderation-audit-card__header">
                        <div>
                          <h3 className="moderation-audit-card__title">
                            {ACTION_LABELS[log.action] || `Action ${log.action}`}
                          </h3>
                          <p className="moderation-muted">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                        <History className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
                      </header>
                      <div className="moderation-audit-card__badge-row">
                        <Badge tone={[3, 5, 8].includes(Number(log.action)) ? 'success' : [4, 6, 7].includes(Number(log.action)) ? 'warning' : 'info'}>
                          {SCOPE_LABELS[log.scopeType] || 'Moderation'}
                        </Badge>
                      </div>
                      <div className="moderation-meta-grid">
                        <div className="moderation-meta-item">
                          <span>Moderator</span>
                          <span>{log.performedByDisplayName || 'Unknown user'}</span>
                        </div>
                        <div className="moderation-meta-item">
                          <span>Target</span>
                          <span>{log.targetDisplayName || '-'}</span>
                        </div>
                        {log.scopeType ? (
                          <div className="moderation-meta-item">
                            <span>Scope</span>
                            <span>{log.scopeName || SCOPE_LABELS[log.scopeType] || log.scopeType}</span>
                          </div>
                        ) : null}
                        {log.notes ? (
                          <div className="moderation-meta-item">
                            <span>Notes</span>
                            <span>{log.notes}</span>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No audit logs found" />
              )
            ) : null}
          </section>
        </div>
      </Container>
    </PageLayout>
  );
}

export default AuditLogPage;
