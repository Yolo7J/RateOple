import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGroupsQuery } from '../queries/useGroupsQuery';
import GroupCard from '../components/GroupCard';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';
import Button from '../../../shared/ui/Button';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import LoadingState from '../../../shared/ui/LoadingState';
import PageHeader from '../../../shared/ui/PageHeader';
import Select from '../../../shared/ui/Select';

const styles = {
  muted: 'text-[var(--text-muted)]',
  pageStack: 'gap-6',
  sectionStack: 'gap-4',
  sectionTitle: 'ui-section-title',
  section: 'ui-card p-4 sm:p-6',
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
          <PageHeader
            title="Groups"
            actions={user ? <Button as={Link} to="/groups/new" variant="primary">Create group</Button> : null}
          />

          <section className={styles.section}>
            <Stack className={styles.sectionStack}>
              <h2 className={styles.sectionTitle}>Browse Groups</h2>
              <Input
                placeholder="Search groups"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  aria-label="Group visibility"
                >
                  <option value="">All visible groups</option>
                  <option value="Public">Public groups</option>
                  <option value="Private">Private groups</option>
                </Select>
                <p className={`${styles.muted} text-sm`}>
                  More discovery filters will be added when groups support tags or categories.
                </p>
              </div>
              {loading ? <LoadingState label="Loading groups..." /> : null}
              {error ? <InlineMessage tone="error">Failed to load groups.</InlineMessage> : null}
              {!loading && !error ? (
                <Grid variant="cards" className={styles.grid}>
                  {items.map((group) => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                  {items.length === 0 ? <EmptyState title="No groups found" /> : null}
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
