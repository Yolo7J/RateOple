import { Link, useNavigate } from 'react-router-dom';
import { useMediaListQuery } from '../queries/useMediaListQuery';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';

const styles = {
  pageStack: 'gap-6',
  header: 'flex flex-wrap items-center justify-between gap-3',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  subtitle: 'text-sm text-[var(--text-muted)]',
  addButton: [
    'inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold',
    'text-[#151515] shadow-[0_10px_24px_-18px_rgba(245,197,24,0.9)] transition hover:bg-[var(--accent-strong)]',
  ].join(' '),
  table: [
    'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]',
  ].join(' '),
  tableHeader: [
    'grid grid-cols-[minmax(160px,2fr)_120px_120px_140px_160px] gap-4',
    'border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-xs uppercase tracking-[0.12em]',
    'text-[var(--text-muted)]',
  ].join(' '),
  row: [
    'grid grid-cols-[minmax(160px,2fr)_120px_120px_140px_160px] gap-4',
    'px-4 py-3 text-sm text-[var(--text-primary)]',
  ].join(' '),
  rowDivider: 'border-b border-[var(--border)] last:border-b-0',
  titleCell: 'font-semibold text-[var(--text-primary)]',
  muted: 'text-[var(--text-muted)]',
  actions: 'flex items-center gap-2',
  actionBtn: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold',
    'text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)]',
  ].join(' '),
  deleteBtn: [
    'inline-flex items-center justify-center rounded-lg border border-[#ff7d7d]/40 px-3 py-1.5 text-xs font-semibold',
    'text-[#ff7d7d] transition hover:bg-[#ff7d7d]/10 disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
  loading: 'text-sm text-[var(--text-muted)]',
  error: 'text-sm text-[#ff6d75]',
  empty: [
    'rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-bg)]',
    'px-6 py-10 text-center text-sm text-[var(--text-muted)]',
  ].join(' '),
  responsiveHint: 'text-xs text-[var(--text-muted)] md:hidden',
};

const formatMediaType = (type) => {
  if (!type) return '—';
  if (type.toLowerCase() === 'tvseries') return 'TV Series';
  return type;
};

const resolveCreatedAt = (item) => item?.createdAt || item?.createdOn || item?.createdDate || null;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const AdminMediaPage = () => {
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
  } = useMediaListQuery({ page: 1, pageSize: 50 });

  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Media Management</h1>
              <p className={styles.subtitle}>Review and manage the media catalog.</p>
            </div>
            <button className={styles.addButton} onClick={() => navigate('/media/add?from=admin')}>
              + Add Media
            </button>
          </div>

          <p className={styles.responsiveHint}>Swipe horizontally to view all columns.</p>

          {loading ? <p className={styles.loading}>Loading media...</p> : null}
          {error ? (
            <p className={styles.error}>
              {error?.response?.data?.message || 'Failed to load media list.'}
            </p>
          ) : null}

          {!loading && !error ? (
            items.length > 0 ? (
              <div className={styles.table}>
                <div className={styles.tableHeader}>
                  <div>Title</div>
                  <div>Type</div>
                  <div>Year</div>
                  <div>Created</div>
                  <div>Actions</div>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {items.map((item) => (
                    <div key={item.id} className={`${styles.row} ${styles.rowDivider}`}>
                      <div className={styles.titleCell}>{item.title || 'Untitled'}</div>
                      <div className={styles.muted}>{formatMediaType(item.type)}</div>
                      <div className={styles.muted}>{item.releaseYear ?? '—'}</div>
                      <div className={styles.muted}>{formatDate(resolveCreatedAt(item))}</div>
                      <div className={styles.actions}>
                        <Link
                          className={styles.actionBtn}
                          to={`/admin/media/${item.id}/edit`}
                        >
                          Edit
                        </Link>
                        <button className={styles.deleteBtn} type="button" disabled>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.empty}>No media items found.</div>
            )
          ) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
};

export default AdminMediaPage;
