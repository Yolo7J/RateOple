import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useGroupsQuery } from '../queries/useGroupsQuery';
import { useGroupMutations } from '../queries/useGroupMutations';
import GroupCard from '../components/GroupCard';
import '../components/groups.css';
import './GroupsPage.css';

const VISIBILITY = {
  Public: 1,
  Private: 2,
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
    <main className="ro-page">
      <h1>Groups</h1>

      {user ? (
        <section className="ro-review-section">
          <h2>Create Group</h2>
          <form className="ro-group-form" onSubmit={handleCreateGroup}>
            <input
              placeholder="Group name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <textarea
              rows={3}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <select
              value={form.visibility}
              onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
            >
              <option value="Public">Public</option>
              <option value="Private">Private</option>
            </select>
            <button type="submit" disabled={mutating}>{mutating ? 'Creating...' : 'Create group'}</button>
          </form>
          {actionError ? <p className="ro-error">{actionError}</p> : null}
        </section>
      ) : null}

      <section className="ro-review-section">
        <h2>Browse Groups</h2>
        <input
          className="ro-group-form"
          placeholder="Search groups"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {loading ? <p>Loading groups...</p> : null}
        {error ? <p className="ro-error">Failed to load groups.</p> : null}
        {!loading && !error ? (
          <div className="ro-groups-grid">
            {items.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
            {items.length === 0 ? <p className="ro-muted">No groups found.</p> : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default GroupsPage;
