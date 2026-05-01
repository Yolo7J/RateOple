import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGroupsQuery } from '../queries/useGroupsQuery';
import GroupCard from '../components/GroupCard';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';

const styles = {
  muted: 'text-[var(--text-muted)]',
  error: 'text-[#ff7f7f]',
  pageStack: 'gap-6',
  sectionStack: 'gap-4',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  headerRow: 'flex flex-wrap items-center justify-between gap-3',
  sectionTitle: 'text-xl font-semibold',
  section: [
    'rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]',
    'p-4 sm:p-6',
  ].join(' '),
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
  const [visibility, setVisibility] = useState('');

  const { data, loading, error } = useGroupsQuery({ search, visibility, page: 1, pageSize: 30 });

  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Groups</h1>
            {user ? (
              <Link className={styles.button} to="/groups/new">
                Create group
              </Link>
            ) : null}
          </div>

          <section className={styles.section}>
            <Stack className={styles.sectionStack}>
              <h2 className={styles.sectionTitle}>Browse Groups</h2>
              <input
                className={styles.input}
                placeholder="Search groups"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className={styles.select}
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  aria-label="Group visibility"
                >
                  <option value="">All visible groups</option>
                  <option value="Public">Public groups</option>
                  <option value="Private">Private groups</option>
                </select>
                <p className={`${styles.muted} text-sm`}>
                  More discovery filters will be added when groups support tags or categories.
                </p>
              </div>
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
