import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useGroupsQuery } from '../queries/useGroupsQuery';
import { useGroupMutations } from '../queries/useGroupMutations';
import GroupCard from '../components/GroupCard';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';

const VISIBILITY = {
  Public: 1,
  Private: 2,
};

const styles = {
  muted: 'text-[var(--text-muted)]',
  error: 'text-[#ff7f7f]',
  pageStack: 'gap-6',
  sectionStack: 'gap-4',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  sectionTitle: 'text-xl font-semibold',
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
  grid: 'gap-4',
};

function GroupsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'Public',
  });
  const [actionError, setActionError] = useState('');

  const { data, loading, error } = useGroupsQuery({ search, page: 1, pageSize: 30 });
  const { createGroup, loading: mutating } = useGroupMutations();

  const items = Array.isArray(data?.items) ? data.items : [];

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
          <h1 className={styles.title}>Groups</h1>

          {user ? (
            <section className={styles.section}>
              <Stack className={styles.sectionStack}>
                <h2 className={styles.sectionTitle}>Create Group</h2>
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
                </form>
                {actionError ? <p className={styles.error}>{actionError}</p> : null}
              </Stack>
            </section>
          ) : null}

          <section className={styles.section}>
            <Stack className={styles.sectionStack}>
              <h2 className={styles.sectionTitle}>Browse Groups</h2>
              <input
                className={styles.input}
                placeholder="Search groups"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {loading ? <p className={styles.muted}>Loading groups...</p> : null}
              {error ? <p className={styles.error}>Failed to load groups.</p> : null}
              {!loading && !error ? (
                <Grid variant="cards" className={styles.grid}>
                  {items.map((group) => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                  {items.length === 0 ? <p className={styles.muted}>No groups found.</p> : null}
                </Grid>
              ) : null}
            </Stack>
          </section>
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default GroupsPage;
