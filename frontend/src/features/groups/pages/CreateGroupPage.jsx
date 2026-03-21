import { useState } from 'react';
import { useGroupMutations } from '../queries/useGroupMutations';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';

const VISIBILITY = {
  Public: 1,
  Private: 2,
};

const styles = {
  pageStack: 'gap-6',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  section: [
    'rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]',
    'p-4 sm:p-6',
  ].join(' '),
  form: 'grid gap-3 max-w-2xl',
  input: [
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  ].join(' '),
  select: [
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-[var(--text-primary)]',
  ].join(' '),
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
  error: 'text-[#ff7f7f]',
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
          <h1 className={styles.title}>Create Group</h1>
          <section className={styles.section}>
            <form className={styles.form} onSubmit={handleCreateGroup}>
              <input
                className={styles.input}
                placeholder="Group name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <textarea
                className={styles.input}
                rows={3}
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
              <select
                className={styles.select}
                value={form.visibility}
                onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
              >
                <option value="Public">Public</option>
                <option value="Private">Private</option>
              </select>
              <button className={styles.button} type="submit" disabled={mutating}>
                {mutating ? 'Creating...' : 'Create group'}
              </button>
              {actionError ? <p className={styles.error}>{actionError}</p> : null}
            </form>
          </section>
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default CreateGroupPage;
