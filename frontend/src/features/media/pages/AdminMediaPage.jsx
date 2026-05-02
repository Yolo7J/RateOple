import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMediaListQuery } from '../queries/useMediaListQuery';
import * as mediaService from '../services/mediaService';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';
import Button from '../../../shared/ui/Button';
import DataTable from '../../../shared/ui/DataTable';
import Dialog from '../../../shared/ui/Dialog';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import PageHeader from '../../../shared/ui/PageHeader';

const styles = {
  pageStack: 'gap-6',
  titleCell: 'font-semibold text-[var(--text-primary)]',
  muted: 'text-[var(--text-muted)]',
  actions: 'flex items-center gap-2',
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
    refetch,
  } = useMediaListQuery({ page: 1, pageSize: 50 });

  const items = Array.isArray(data?.items) ? data.items : [];
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deletingId = deleting && deleteTarget ? deleteTarget.id : null;
  const tableColumns = [
    {
      key: 'title',
      header: 'Title',
      render: (item) => <span className={styles.titleCell}>{item.title || 'Untitled'}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (item) => <span className={styles.muted}>{formatMediaType(item.type)}</span>,
    },
    {
      key: 'year',
      header: 'Year',
      render: (item) => <span className={styles.muted}>{item.releaseYear ?? 'N/A'}</span>,
    },
    {
      key: 'created',
      header: 'Created',
      render: (item) => <span className={styles.muted}>{formatDate(resolveCreatedAt(item))}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className={styles.actions}>
          <Button as={Link} size="sm" to={`/admin/media/${item.id}/edit`}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setDeleteError('');
              setDeleteTarget(item);
            }}
            disabled={Boolean(deletingId)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await mediaService.deleteMedia(deleteTarget.id);
      await refetch();
      setDeleteTarget(null);
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to delete media.';
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <PageHeader
            title="Media Management"
            subtitle="Review and manage the media catalog."
            actions={(
              <Button variant="primary" onClick={() => navigate('/media/add?from=admin')}>
                Add Media
              </Button>
            )}
          />

          <p className={styles.responsiveHint}>Swipe horizontally to view all columns.</p>

          {loading ? <LoadingState label="Loading media..." /> : null}
          {error ? (
            <InlineMessage tone="error">
              {error?.response?.data?.message || 'Failed to load media list.'}
            </InlineMessage>
          ) : null}
          {deleteError ? <InlineMessage tone="error">{deleteError}</InlineMessage> : null}

          {!loading && !error ? (
            items.length > 0 ? (
              <DataTable columns={tableColumns} rows={items} />
            ) : (
              <EmptyState title="No media items found" />
            )
          ) : null}
        </Stack>
      </Container>

      <Dialog
        open={Boolean(deleteTarget)}
        title="Delete media?"
        description={`You are about to delete ${deleteTarget?.title || 'this media item'}. This action cannot be undone.`}
        onClose={() => {
          if (deleting) return;
          setDeleteTarget(null);
          setDeleteError('');
        }}
        actions={(
          <>
            <Button
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError('');
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        )}
      >
        {deleteError ? <InlineMessage tone="error">{deleteError}</InlineMessage> : null}
      </Dialog>
    </PageLayout>
  );
};

export default AdminMediaPage;
