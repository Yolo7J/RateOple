import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Library } from 'lucide-react';
import { useCollectionMutations } from '../queries/useCollectionMutations';
import { useMediaDetailsQuery } from '../../media/queries/useMediaDetailsQuery';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Button from '../../../shared/ui/Button';
import FormField from '../../../shared/ui/FormField';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import Textarea from '../../../shared/ui/Textarea';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import '../collections.css';

const USER_OWNER_TYPE = 2;

const SORT_OPTIONS = [
  { value: '3', label: 'Release chronology' },
  { value: '1', label: 'Manual order' },
  { value: '5', label: 'Alphabetical' },
  { value: '2', label: 'Highest rated' },
  { value: '4', label: 'Duration' },
];

const validateForm = ({ name, description }) => {
  const errors = {};
  if (!name.trim()) errors.name = 'Collection title is required.';
  if (name.trim().length > 40) errors.name = 'Collection title must be 40 characters or fewer.';
  if (description.trim().length > 1000) errors.description = 'Description must be 1000 characters or fewer.';
  return errors;
};

function CreateCollectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mediaId = searchParams.get('mediaId');
  const { data: media, loading: mediaLoading, error: mediaError } = useMediaDetailsQuery(mediaId);
  const {
    createCollection,
    addItemToCollection,
    loading: mutating,
  } = useCollectionMutations();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortMode, setSortMode] = useState('3');
  const [errors, setErrors] = useState({});
  const [actionError, setActionError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateForm({ name, description });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    let created = null;
    try {
      setActionError('');
      created = await createCollection({
        name: name.trim(),
        description: description.trim() || null,
        ownerType: USER_OWNER_TYPE,
        sortMode: Number(sortMode),
      });

      if (mediaId) {
        await addItemToCollection(created.id, mediaId);
      }

      navigate(`/collections/${created.id}`);
    } catch (err) {
      if (created?.id && mediaId) {
        navigate(`/collections/${created.id}?mediaId=${mediaId}`);
        return;
      }
      setActionError(err?.response?.data?.message || 'Could not create collection.');
    }
  };

  return (
    <PageLayout>
      <Container size="lg">
        <div className="collection-form-page">
          <section className="collection-form-hero" aria-labelledby="create-collection-title">
            <div className="collection-form-hero__copy">
              <Button as={Link} to="/collections" variant="ghost" size="sm">
                <ArrowLeft size={15} aria-hidden="true" />
                Collections
              </Button>
              <div>
                <span className="collection-kicker">
                  <Library size={15} aria-hidden="true" />
                  New saved list
                </span>
                <h1 id="create-collection-title">Create collection</h1>
                <p className="collection-form-hero__subtitle">
                  Name the list, describe the idea, and choose how saved media should be ordered.
                </p>
              </div>
            </div>
          </section>

          <section className="collection-form-panel" aria-label="Create collection form">
            {mediaId ? (
              <div className="collection-form-media-preview">
                <span className="collection-form-media-preview__cover">
                  {media?.coverUrl ? (
                    <img src={buildImageUrl(media.coverUrl, '')} alt="" loading="lazy" />
                  ) : (
                    <Library size={22} aria-hidden="true" />
                  )}
                </span>
                <div>
                  <strong>
                    {mediaLoading ? 'Loading selected media...' : media?.title || 'Selected media'}
                  </strong>
                  <span>
                    {mediaError
                      ? 'The collection will be created, then you can retry adding this media from the detail page.'
                      : 'This media will be added automatically after the collection is created.'}
                  </span>
                </div>
              </div>
            ) : null}

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
                    placeholder="Weekend watchlist"
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
                    placeholder="A concise note about what belongs in this collection."
                  />
                )}
              </FormField>

              <FormField
                label="Default order"
                id="collection-sort-mode"
                hint="You can switch to manual order later from the collection detail page."
              >
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
                  {mutating ? 'Creating...' : 'Create collection'}
                </Button>
                <Button as={Link} to="/collections" variant="ghost">
                  Cancel
                </Button>
              </div>
            </form>
          </section>
        </div>
      </Container>
    </PageLayout>
  );
}

export default CreateCollectionPage;
