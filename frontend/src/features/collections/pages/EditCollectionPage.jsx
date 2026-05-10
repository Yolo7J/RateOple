import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Library, Trash2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCollectionDetailsQuery } from '../queries/useCollectionDetailsQuery';
import { useCollectionMutations } from '../queries/useCollectionMutations';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Button from '../../../shared/ui/Button';
import Dialog from '../../../shared/ui/Dialog';
import EmptyState from '../../../shared/ui/EmptyState';
import FormField from '../../../shared/ui/FormField';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import Textarea from '../../../shared/ui/Textarea';
import '../collections.css';

const SORT_OPTIONS = [
  { value: '3', label: 'Release chronology' },
  { value: '1', label: 'Manual order' },
  { value: '5', label: 'Alphabetical' },
  { value: '2', label: 'Highest rated' },
  { value: '4', label: 'Duration' },
];

const sameId = (left, right) => (
  Boolean(left && right) && String(left).toLowerCase() === String(right).toLowerCase()
);

const canManage = (collection, user) => Boolean(user) && (
  (collection?.ownerType === 2 && sameId(collection?.ownerId, user?.id)) ||
  collection?.ownerType === 3
);

const validateForm = ({ name, description }) => {
  const errors = {};
  if (!name.trim()) errors.name = 'Collection title is required.';
  if (name.trim().length > 40) errors.name = 'Collection title must be 40 characters or fewer.';
  if (description.trim().length > 1000) errors.description = 'Description must be 1000 characters or fewer.';
  return errors;
};

function EditCollectionForm({ collection, collectionId }) {
  const navigate = useNavigate();
  const {
    updateCollection,
    deleteCollection,
    loading: mutating,
  } = useCollectionMutations();

  const [name, setName] = useState(collection.name ?? '');
  const [description, setDescription] = useState(collection.description ?? '');
  const [sortMode, setSortMode] = useState(String(collection.sortMode ?? 3));
  const [errors, setErrors] = useState({});
  const [actionError, setActionError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateForm({ name, description });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setActionError('');
      await updateCollection(collectionId, {
        name: name.trim(),
        description: description.trim(),
        sortMode: Number(sortMode),
      });
      navigate(`/collections/${collectionId}`);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not update collection.');
    }
  };

  const handleDelete = async () => {
    try {
      setActionError('');
      await deleteCollection(collectionId);
      navigate('/collections');
    } catch (err) {
      setDeleteOpen(false);
      setActionError(err?.response?.data?.message || 'Could not delete collection.');
    }
  };

  return (
    <div className="collection-form-page">
      <section className="collection-form-hero" aria-labelledby="edit-collection-title">
        <div className="collection-form-hero__copy">
          <Button as={Link} to={`/collections/${collectionId}`} variant="ghost" size="sm">
            <ArrowLeft size={15} aria-hidden="true" />
            Collection
          </Button>
          <div>
            <span className="collection-kicker">
              <Library size={15} aria-hidden="true" />
              Edit saved list
            </span>
            <h1 id="edit-collection-title">Edit collection</h1>
            <p className="collection-form-hero__subtitle">
              Update the title, description, and default ordering without changing the saved media.
            </p>
          </div>
        </div>
      </section>

      <section className="collection-form-panel" aria-label="Edit collection form">
        <form className="collection-form" onSubmit={handleSubmit}>
          <FormField
            label="Title"
            id="collection-name"
            hint="Use a short name that works on cards and mobile screens."
            error={errors.name}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                required
              />
            )}
          </FormField>

          <FormField
            label="Description"
            id="collection-description"
            hint="Optional. Add the theme, mood, or reason this list exists."
            error={errors.description}
          >
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
                rows={5}
              />
            )}
          </FormField>

          <FormField label="Default order" id="collection-sort-mode">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            )}
          </FormField>

          <p className="collection-form-note">
            Collection visibility is controlled by the current API defaults.
          </p>

          {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}

          <div className="collection-form-actions">
            <Button type="submit" variant="primary" disabled={mutating}>
              {mutating ? 'Saving...' : 'Save changes'}
            </Button>
            <Button as={Link} to={`/collections/${collectionId}`} variant="ghost">
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)} disabled={mutating}>
              <Trash2 size={15} aria-hidden="true" />
              Delete
            </Button>
          </div>
        </form>
      </section>

      <Dialog
        open={deleteOpen}
        title="Delete collection?"
        description={`Delete ${collection.name}? This removes the collection, not the media titles.`}
        onClose={() => setDeleteOpen(false)}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={mutating}>
              {mutating ? 'Deleting...' : 'Delete collection'}
            </Button>
          </>
        )}
      />
    </div>
  );
}

function EditCollectionPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: collection, loading, error } = useCollectionDetailsQuery(id);

  if (loading) {
    return (
      <PageLayout>
        <Container size="lg">
          <div className="collection-form-page">
            <div className="collections-skeleton-card">
              <div className="ui-skeleton collections-skeleton-card__art" />
              <div className="collections-skeleton-card__body">
                <div className="ui-skeleton collections-skeleton-line short" />
                <div className="ui-skeleton collections-skeleton-line" />
                <div className="ui-skeleton collections-skeleton-line" />
              </div>
            </div>
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (error || !collection) {
    return (
      <PageLayout>
        <Container size="lg">
          <div className="collection-form-page">
            <InlineMessage tone="error">Collection not found.</InlineMessage>
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (!canManage(collection, user)) {
    return (
      <PageLayout>
        <Container size="lg">
          <div className="collection-form-page">
            <EmptyState
              title="You cannot edit this collection"
              description="Only the collection owner or supported collection managers can change it."
              action={(
                <Button as={Link} to={`/collections/${id}`} variant="primary">
                  Back to collection
                </Button>
              )}
            />
          </div>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container size="lg">
        <EditCollectionForm key={collection.id} collection={collection} collectionId={id} />
      </Container>
    </PageLayout>
  );
}

export default EditCollectionPage;
