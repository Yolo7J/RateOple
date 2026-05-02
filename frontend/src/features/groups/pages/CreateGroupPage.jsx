import { useState } from 'react';
import { useGroupMutations } from '../queries/useGroupMutations';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';
import Button from '../../../shared/ui/Button';
import FormField from '../../../shared/ui/FormField';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import PageHeader from '../../../shared/ui/PageHeader';
import SectionCard from '../../../shared/ui/SectionCard';
import Select from '../../../shared/ui/Select';
import Textarea from '../../../shared/ui/Textarea';

const VISIBILITY = {
  Public: 1,
  Private: 2,
};

const styles = {
  pageStack: 'gap-6',
  form: 'grid max-w-2xl gap-4',
};

function CreateGroupPage() {
  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'Public',
  });
  const [actionError, setActionError] = useState('');
  const { createGroup, loading: mutating } = useGroupMutations();

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setActionError('');
    try {
      await createGroup({
        name: form.name.trim(),
        description: form.description.trim() || null,
        visibility: VISIBILITY[form.visibility] ?? VISIBILITY.Public,
      });
      setForm({ name: '', description: '', visibility: 'Public' });
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not create group.');
    }
  };

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <PageHeader
            title="Create Group"
            subtitle="Start a focused space for discussing media with a public or private audience."
          />
          <SectionCard>
            <form className={styles.form} onSubmit={handleCreateGroup}>
              <FormField label="Group name">
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    placeholder="Group name"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                )}
              </FormField>
              <FormField label="Description" hint="Optional. Keep it short and specific.">
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    rows={3}
                    placeholder="What will members discuss here?"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                )}
              </FormField>
              <FormField label="Visibility">
                {(fieldProps) => (
                  <Select
                    {...fieldProps}
                    value={form.visibility}
                    onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
                  >
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </Select>
                )}
              </FormField>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" type="submit" disabled={mutating}>
                {mutating ? 'Creating...' : 'Create group'}
                </Button>
              </div>
              {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}
            </form>
          </SectionCard>
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default CreateGroupPage;
