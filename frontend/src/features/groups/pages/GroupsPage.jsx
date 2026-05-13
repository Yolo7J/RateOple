import { Compass, MessageSquare, Plus, RotateCcw, Search, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import PageLayout from '../../../layouts/PageLayout';
import Button from '../../../shared/ui/Button';
import Container from '../../../shared/ui/Container';
import EmptyState from '../../../shared/ui/EmptyState';
import FormField from '../../../shared/ui/FormField';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import { Skeleton } from '../../../shared/ui/LoadingState';
import GroupCard from '../components/GroupCard';
import { useGroupsQuery } from '../queries/useGroupsQuery';
import { formatCount, pluralize } from '../utils/groupFormatters';
import '../groups.css';

function GroupsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState('');

  const { data, loading, error, refetch } = useGroupsQuery({ search, visibility, page: 1, pageSize: 30 });
  const items = Array.isArray(data?.items) ? data.items : [];
  const totalCount = Number.isFinite(Number(data?.totalCount)) ? Number(data.totalCount) : items.length;
  const activeFilterCount = (search.trim() ? 1 : 0) + (visibility ? 1 : 0);
  const canCreateGroup = Boolean(user && !user.isReadOnly);

  const clearFilters = () => {
    setSearch('');
    setVisibility('');
  };

  return (
    <PageLayout className="groups-page">
      <Container size="xxl">
        <div className="groups-shell">
          <section className="groups-hero" aria-labelledby="groups-title">
            <div className="groups-hero__copy">
              <span className="groups-kicker">
                <MessageSquare aria-hidden="true" />
                Community discussions
              </span>
              <h1 id="groups-title">Groups</h1>
              <p>Join conversations around movies, TV series, and books.</p>
              <div className="groups-hero__actions">
                {canCreateGroup ? (
                  <Button as={Link} to="/groups/new" variant="primary" size="lg">
                    <Plus aria-hidden="true" />
                    Create group
                  </Button>
                ) : null}
                {user?.isReadOnly ? (
                  <Button type="button" variant="primary" size="lg" disabled title="Confirm your email or resolve the suspension before creating groups.">
                    <Plus aria-hidden="true" />
                    Create group
                  </Button>
                ) : null}
                <Button as={Link} to="/media" variant="ghost" size="lg">
                  <Compass aria-hidden="true" />
                  Browse media
                </Button>
              </div>
            </div>

            <div className="groups-hero__panel" aria-label="Groups summary">
              <div>
                <span>Visible groups</span>
                <strong>{loading ? '...' : formatCount(totalCount)}</strong>
              </div>
              <div>
                <span>Discovery mode</span>
                <strong>{visibility || 'All visible'}</strong>
              </div>
              <div>
                <span>Signed in</span>
                <strong>{user ? 'Ready to post' : 'Read-only'}</strong>
              </div>
            </div>
          </section>

          <section className="groups-discovery" aria-labelledby="groups-discovery-title">
            <div className="groups-discovery__header">
              <div>
                <span className="groups-eyebrow">Find a community</span>
                <h2 id="groups-discovery-title">Browse groups</h2>
                <p>
                  {loading
                    ? 'Loading conversations...'
                    : `${pluralize(totalCount, 'group')} available from current filters.`}
                </p>
              </div>
              {activeFilterCount > 0 ? (
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  <RotateCcw aria-hidden="true" />
                  Reset
                </Button>
              ) : null}
            </div>

            <div className="groups-controls">
              <FormField label="Search groups" className="groups-controls__search">
                {(fieldProps) => (
                  <div className="groups-search-input">
                    <Search aria-hidden="true" />
                    <Input
                      {...fieldProps}
                      type="search"
                      placeholder="Search by group name..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                )}
              </FormField>
              <FormField label="Visibility">
                {(fieldProps) => (
                  <Select
                    {...fieldProps}
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value)}
                  >
                    <option value="">All visible groups</option>
                    <option value="Public">Public groups</option>
                    <option value="Private">Private groups</option>
                  </Select>
                )}
              </FormField>
            </div>

            {error ? (
              <InlineMessage tone="error">
                Failed to load groups.
                <Button type="button" size="sm" className="ml-3" onClick={() => refetch?.()}>
                  Try again
                </Button>
              </InlineMessage>
            ) : null}

            {loading ? (
              <div className="groups-grid" aria-label="Loading groups">
                {Array.from({ length: 6 }).map((_, index) => (
                  <article key={index} className="group-card group-card--skeleton">
                    <Skeleton className="group-card__skeleton-pill" />
                    <Skeleton className="group-card__skeleton-title" />
                    <Skeleton className="group-card__skeleton-line" />
                    <Skeleton className="group-card__skeleton-line short" />
                    <Skeleton className="group-card__skeleton-stats" />
                  </article>
                ))}
              </div>
            ) : null}

            {!loading && !error ? (
              <>
                {items.length > 0 ? (
                  <div className="groups-grid">
                    {items.map((group) => (
                      <GroupCard key={group.id} group={group} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No groups found"
                    description="Try a different search, browse media for inspiration, or create the first space for this conversation."
                    action={(
                      <div className="groups-empty-actions">
                        {canCreateGroup ? (
                          <Button as={Link} to="/groups/new" variant="primary">
                            <Plus aria-hidden="true" />
                            Create group
                          </Button>
                        ) : null}
                        <Button as={Link} to="/media">
                          <Users aria-hidden="true" />
                          Browse media
                        </Button>
                      </div>
                    )}
                  />
                )}
              </>
            ) : null}
          </section>
        </div>
      </Container>
    </PageLayout>
  );
}

export default GroupsPage;
