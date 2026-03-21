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
  const [sortMode, setSortMode] = useState('members');
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  const { data, loading, error } = useGroupsQuery({ search, page: 1, pageSize: 30 });

  const items = Array.isArray(data?.items) ? data.items : [];
  const filtered = items.filter((group) => {
    const haystack = `${group.name} ${group.description ?? ''}`.toLowerCase();
    if (mediaTypeFilter !== 'all' && !haystack.includes(mediaTypeFilter)) return false;
    if (tagFilter !== 'all' && !haystack.includes(tagFilter)) return false;
    return true;
  });

  const sortedItems = [...filtered].sort((a, b) => {
    if (sortMode === 'posts') return (b.postsCount ?? 0) - (a.postsCount ?? 0);
    if (sortMode === 'newest') return new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0);
    return (b.membersCount ?? 0) - (a.membersCount ?? 0);
  });

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
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  className={styles.select}
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                >
                  <option value="members">Most members</option>
                  <option value="posts">Most posts</option>
                  <option value="newest">Newest</option>
                </select>
                <select
                  className={styles.select}
                  value={mediaTypeFilter}
                  onChange={(e) => setMediaTypeFilter(e.target.value)}
                >
                  <option value="all">All media types</option>
                  <option value="movie">Movies</option>
                  <option value="book">Books</option>
                  <option value="tv">TV Shows</option>
                </select>
                <select
                  className={styles.select}
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                >
                  <option value="all">All tags</option>
                  <option value="action">Action</option>
                  <option value="adventure">Adventure</option>
                  <option value="drama">Drama</option>
                  <option value="fantasy">Fantasy</option>
                </select>
              </div>
              {loading ? <p className={styles.muted}>Loading groups...</p> : null}
              {error ? <p className={styles.error}>Failed to load groups.</p> : null}
              {!loading && !error ? (
                <Grid variant="cards" className={styles.grid}>
                  {sortedItems.map((group) => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                  {sortedItems.length === 0 ? <p className={styles.muted}>No groups found.</p> : null}
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
