import { ArrowLeft, Lock, Plus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../shared/ui/Button';
import Container from '../../../shared/ui/Container';
import FormField from '../../../shared/ui/FormField';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import Textarea from '../../../shared/ui/Textarea';
import PageLayout from '../../../layouts/PageLayout';
import { useGroupMutations } from '../queries/useGroupMutations';
import '../groups.css';

const VISIBILITY = {
  Public: 1,
  Private: 2,
};

function CreateGroupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'Public',
  });
  const [submitted, setSubmitted] = useState(false);
  const [actionError, setActionError] = useState('');
  const { createGroup, loading: mutating } = useGroupMutations();

  const nameError = useMemo(() => {
    if (!submitted) return '';
    if (!form.name.trim()) return 'Group name is required.';
    return '';
  }, [form.name, submitted]);

  const handleFieldChange = (field, value) => {
    setActionError('');
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (!form.name.trim()) return;

    setActionError('');
    try {
      const created = await createGroup({
        name: form.name.trim(),
        description: form.description.trim() || null,
        visibility: VISIBILITY[form.visibility] ?? VISIBILITY.Public,
      });
      navigate(created?.id ? `/groups/${created.id}` : '/groups');
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not create group.');
    }
  };

  return (
    <PageLayout className="groups-page">
      <Container size="lg">
        <div className="group-create-shell">
          <Link className="groups-back-link" to="/groups">
            <ArrowLeft aria-hidden="true" />
            Groups
          </Link>

          <section className="group-create-hero" aria-labelledby="create-group-title">
            <span className="groups-kicker">
              <Users aria-hidden="true" />
              New community
            </span>
            <h1 id="create-group-title">Create group</h1>
            <p>Start a focused space for discussing media with a public or private audience.</p>
          </section>

          <section className="group-section" aria-labelledby="create-group-form-title">
            <div className="group-section__header">
              <div>
                <span className="groups-eyebrow">Group setup</span>
                <h2 id="create-group-form-title">Details</h2>
              </div>
            </div>

            <form className="group-form group-create-form" onSubmit={handleCreateGroup} noValidate>
              <FormField label="Group name" hint="Use a short, recognizable name." error={nameError}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    maxLength={80}
                    placeholder="Example: Slow cinema club"
                    value={form.name}
                    onChange={(event) => handleFieldChange('name', event.target.value)}
                    required
                  />
                )}
              </FormField>

              <FormField label="Description" hint="Optional. Describe what members should discuss here.">
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    rows={5}
                    maxLength={1000}
                    placeholder="What kinds of movies, TV series, or books belong in this group?"
                    value={form.description}
                    onChange={(event) => handleFieldChange('description', event.target.value)}
                  />
                )}
              </FormField>

              <FormField label="Visibility" hint="Private groups are visible only to members.">
                {(fieldProps) => (
                  <Select
                    {...fieldProps}
                    value={form.visibility}
                    onChange={(event) => handleFieldChange('visibility', event.target.value)}
                  >
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </Select>
                )}
              </FormField>

              <div className="group-visibility-preview" aria-live="polite">
                {form.visibility === 'Private' ? <Lock aria-hidden="true" /> : <Users aria-hidden="true" />}
                <div>
                  <strong>{form.visibility} group</strong>
                  <span>
                    {form.visibility === 'Private'
                      ? 'Only members can view and participate.'
                      : 'Anyone can discover the group, and signed-in users can join.'}
                  </span>
                </div>
              </div>

              {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}

              <div className="group-form__actions group-form__actions--split">
                <Button as={Link} to="/groups" variant="ghost">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={mutating || !form.name.trim()}>
                  <Plus aria-hidden="true" />
                  {mutating ? 'Creating...' : 'Create group'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </Container>
    </PageLayout>
  );
}

export default CreateGroupPage;
