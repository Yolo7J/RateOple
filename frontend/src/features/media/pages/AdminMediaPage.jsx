import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { useMediaListQuery } from '../queries/useMediaListQuery';
import * as mediaService from '../services/mediaService';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';
import Button from '../../../shared/ui/Button';
import Dialog from '../../../shared/ui/Dialog';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import Badge from '../../../shared/ui/Badge';
import '../media-management.css';

const styles = {
  pageStack: 'gap-6',
};

const formatMediaType = (type) => {
  if (!type) return '-';
  if (type.toLowerCase() === 'tvseries') return 'TV Series';
  return type;
};

const resolveCreatedAt = (item) => item?.createdAt || item?.createdOn || item?.createdDate || null;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
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

  const renderActions = (item) => (
    <div className="staff-actions">
      <Button as={Link} size="sm" to={`/admin/media/${item.id}/edit`}>
        <Edit3 size={14} aria-hidden="true" />
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
        <Trash2 size={14} aria-hidden="true" />
        Delete
      </Button>
    </div>
  );

  return (
    <PageLayout>
      <Container size="xxl">
        <Stack className={styles.pageStack}>
          <header className="staff-hero">
            <div className="staff-hero__content">
              <p className="staff-eyebrow">Catalog operations</p>
              <h1 className="staff-hero__title">Media management</h1>
              <p className="staff-hero__copy">
                Review, edit, and curate the RateOple catalog from a staff-focused workspace.
              </p>
              <div className="staff-hero__meta">
                <Badge>{items.length} loaded</Badge>
                <Badge>Movies, TV series, books</Badge>
              </div>
              <div className="staff-hero__actions">
                <Button variant="primary" onClick={() => navigate('/media/add?from=admin')}>
                  <Plus size={16} aria-hidden="true" />
                  Add media
                </Button>
              </div>
            </div>
          </header>

          {loading ? <LoadingState label="Loading media..." /> : null}
          {error ? (
            <InlineMessage tone="error">
              {error?.response?.data?.message || 'Failed to load media list.'}
            </InlineMessage>
          ) : null}
          {deleteError ? <InlineMessage tone="error">{deleteError}</InlineMessage> : null}

          {!loading && !error ? (
            items.length > 0 ? (
              <section className="staff-panel" aria-labelledby="media-catalog-title">
                <div className="staff-toolbar">
                  <div>
                    <h2 className="staff-form-section__title" id="media-catalog-title">Catalog items</h2>
                    <p className="staff-form-section__copy">Use edit for metadata changes; destructive actions stay separated.</p>
                  </div>
                </div>

                <table className="staff-media-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Year</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="staff-media-title">{item.title || 'Untitled'}</span>
                        </td>
                        <td>
                          <span className="staff-media-meta">{formatMediaType(item.type)}</span>
                        </td>
                        <td>
                          <span className="staff-media-meta">{item.releaseYear ?? 'N/A'}</span>
                        </td>
                        <td>
                          <span className="staff-media-meta">{formatDate(resolveCreatedAt(item))}</span>
                        </td>
                        <td>{renderActions(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="staff-media-card-list">
                  {items.map((item) => (
                    <article key={item.id} className="staff-media-card">
                      <div>
                        <h3 className="staff-media-title">{item.title || 'Untitled'}</h3>
                        <p className="staff-media-meta">{formatMediaType(item.type)}</p>
                      </div>
                      <div className="staff-media-card__meta">
                        <div className="staff-key-value">
                          <span>Year</span>
                          <span>{item.releaseYear ?? 'N/A'}</span>
                        </div>
                        <div className="staff-key-value">
                          <span>Created</span>
                          <span>{formatDate(resolveCreatedAt(item))}</span>
                        </div>
                      </div>
                      {renderActions(item)}
                    </article>
                  ))}
                </div>
              </section>
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
