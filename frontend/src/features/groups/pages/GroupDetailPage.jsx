import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGroupDetailsQuery } from '../queries/useGroupDetailsQuery';
import { useGroupPostsQuery } from '../queries/useGroupPostsQuery';
import { useGroupPinnedMediaQuery } from '../queries/useGroupPinnedMediaQuery';
import { useGroupMembersQuery } from '../queries/useGroupMembersQuery';
import { useGroupStaffMessagesQuery } from '../queries/useGroupStaffMessagesQuery';
import { useGroupMutations } from '../queries/useGroupMutations';
import GroupPostCard from '../components/GroupPostCard';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';

const styles = {
  pageStack: 'gap-6',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  description: 'text-[var(--text-secondary)]',
  muted: 'text-[var(--text-muted)]',
  error: 'text-[#ff7f7f]',
  controls: 'flex flex-wrap gap-2',
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
  section: [
    'rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]',
    'p-4 sm:p-6',
  ].join(' '),
  sectionTitle: 'text-xl font-semibold',
  form: 'grid gap-3 max-w-2xl',
  input: [
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  ].join(' '),
  pinnedGrid: 'gap-3',
  pinnedItem: 'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3',
  posts: 'grid gap-4',
  staffGrid: 'grid gap-3',
  staffMessage: 'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3',
  staffHeader: 'flex flex-wrap items-center justify-between gap-2',
  memberRow: 'flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3',
  roleBadge: 'rounded-full bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--text-muted)]',
  actionRow: 'flex flex-wrap gap-2',
};

const GROUP_ROLE = {
  Member: 1,
  GroupModerator: 2,
  GroupAdmin: 3,
  Owner: 4,
};

const ROLE_LABELS = {
  1: 'Member',
  2: 'Group Moderator',
  3: 'Group Admin',
  4: 'Owner',
};

function GroupDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: group, loading, error } = useGroupDetailsQuery(id);
  const { data: postsData, loading: postsLoading, error: postsError } = useGroupPostsQuery(id, { page: 1, pageSize: 30 });
  const { data: pinnedData } = useGroupPinnedMediaQuery(id);
  const { joinGroup, leaveGroup, createPost, addPinnedMedia, setMemberRole, banUser, createStaffMessage, loading: mutating } = useGroupMutations();

  const posts = useMemo(() => (Array.isArray(postsData?.items) ? postsData.items : []), [postsData]);
  const pinned = Array.isArray(pinnedData) ? pinnedData : [];
  const viewerRole = group?.viewerRole ?? null;
  const isMember = Boolean(viewerRole);
  const canManageRoles = viewerRole === GROUP_ROLE.Owner || viewerRole === GROUP_ROLE.GroupAdmin;
  const canModerate = viewerRole === GROUP_ROLE.Owner || viewerRole === GROUP_ROLE.GroupAdmin || viewerRole === GROUP_ROLE.GroupModerator;

  const { data: membersData } = useGroupMembersQuery(id, canManageRoles);
  const { data: staffData } = useGroupStaffMessagesQuery(id, canModerate);
  const members = Array.isArray(membersData) ? membersData : [];
  const staffMessages = Array.isArray(staffData) ? staffData : [];

  const [postForm, setPostForm] = useState({ title: '', content: '', mediaIds: '' });
  const [pinMediaId, setPinMediaId] = useState('');
  const [staffMessage, setStaffMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const handleJoin = async () => {
    if (!id) return;
    setActionError('');
    try {
      await joinGroup(id);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not join group.');
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    setActionError('');
    try {
      await leaveGroup(id);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not leave group.');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!id) return;

    const mediaIds = postForm.mediaIds
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    setActionError('');
    try {
      await createPost(id, {
        title: postForm.title.trim(),
        content: postForm.content.trim(),
        mediaIds,
      });
      setPostForm({ title: '', content: '', mediaIds: '' });
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not create post.');
    }
  };

  const handlePinMedia = async (e) => {
    e.preventDefault();
    if (!id || !pinMediaId.trim()) return;
    setActionError('');
    try {
      await addPinnedMedia(id, pinMediaId.trim());
      setPinMediaId('');
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not pin media.');
    }
  };

  const handleRoleChange = async (userId, role) => {
    if (!id) return;
    setActionError('');
    try {
      await setMemberRole(id, userId, role);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not update role.');
    }
  };

  const handleBanUser = async (userId) => {
    if (!id) return;
    setActionError('');
    try {
      await banUser(id, { userId });
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not ban user.');
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <Container>
          <p className={styles.muted}>Loading group...</p>
        </Container>
      </PageLayout>
    );
  }

  if (error || !group) {
    return (
      <PageLayout>
        <Container>
          <p className={styles.error}>Group not found.</p>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <Stack className="gap-2">
            <h1 className={styles.title}>{group.name}</h1>
            {group.description ? <p className={styles.description}>{group.description}</p> : null}
            <p className={styles.muted}>
              {group.membersCount ?? 0} members · {group.postsCount ?? 0} posts
            </p>
          </Stack>

          {user ? (
            <div className={styles.controls}>
              {!isMember ? (
                <button className={styles.button} type="button" onClick={handleJoin} disabled={mutating}>
                  Join Group
                </button>
              ) : null}
              {isMember && viewerRole !== GROUP_ROLE.Owner ? (
                <button className={styles.button} type="button" onClick={handleLeave} disabled={mutating}>
                  Leave Group
                </button>
              ) : null}
            </div>
          ) : null}

          {actionError ? <p className={styles.error}>{actionError}</p> : null}

          <section className={styles.section}>
            <Stack className="gap-4">
              <h2 className={styles.sectionTitle}>Pinned Media</h2>
              {canModerate ? (
                <form className={styles.form} onSubmit={handlePinMedia}>
                  <input
                    className={styles.input}
                    placeholder="Media ID to pin"
                    value={pinMediaId}
                    onChange={(e) => setPinMediaId(e.target.value)}
                  />
                  <button className={styles.button} type="submit" disabled={mutating}>
                    Pin Media
                  </button>
                </form>
              ) : null}
              <Grid cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" className={styles.pinnedGrid}>
                {pinned.map((item) => (
                  <article key={item.mediaId} className={styles.pinnedItem}>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                    <p className={styles.muted}>{new Date(item.addedAt).toLocaleDateString()}</p>
                  </article>
                ))}
                {pinned.length === 0 ? <p className={styles.muted}>No pinned media yet.</p> : null}
              </Grid>
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack className="gap-4">
              <h2 className={styles.sectionTitle}>Create Post</h2>
              {user && isMember ? (
                <form className={styles.form} onSubmit={handleCreatePost}>
                  <input
                    className={styles.input}
                    placeholder="Post title"
                    value={postForm.title}
                    onChange={(e) => setPostForm((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                  <textarea
                    className={styles.input}
                    rows={4}
                    placeholder="Post content"
                    value={postForm.content}
                    onChange={(e) => setPostForm((prev) => ({ ...prev, content: e.target.value }))}
                    required
                  />
                  <input
                    className={styles.input}
                    placeholder="Media IDs (comma separated, optional)"
                    value={postForm.mediaIds}
                    onChange={(e) => setPostForm((prev) => ({ ...prev, mediaIds: e.target.value }))}
                  />
                  <button className={styles.button} type="submit" disabled={mutating}>
                    Publish Post
                  </button>
                </form>
              ) : (
                <p className={styles.muted}>Join the group to create posts.</p>
              )}
            </Stack>
          </section>

          {canManageRoles ? (
            <section className={styles.section}>
              <Stack className="gap-4">
                <h2 className={styles.sectionTitle}>Members</h2>
                <div className={styles.staffGrid}>
                  {members.map((member) => {
                    const canSetGroupAdmin = viewerRole === GROUP_ROLE.Owner && member.role !== GROUP_ROLE.Owner;
                    const canSetGroupModerator =
                      member.role !== GROUP_ROLE.Owner &&
                      (viewerRole === GROUP_ROLE.Owner || viewerRole === GROUP_ROLE.GroupAdmin);
                    const canDemote =
                      member.role !== GROUP_ROLE.Owner &&
                      (viewerRole === GROUP_ROLE.Owner || viewerRole === GROUP_ROLE.GroupAdmin);
                    const canBan =
                      member.role !== GROUP_ROLE.Owner &&
                      (viewerRole === GROUP_ROLE.Owner ||
                        (viewerRole === GROUP_ROLE.GroupAdmin && member.role !== GROUP_ROLE.GroupAdmin));

                    return (
                      <div key={member.userId} className={styles.memberRow}>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {member.userName || member.userId}
                          </p>
                          <span className={styles.roleBadge}>Role: {ROLE_LABELS[member.role] || member.role}</span>
                        </div>
                        <div className={styles.actionRow}>
                          {canSetGroupAdmin ? (
                            <button
                              className={styles.button}
                              type="button"
                              onClick={() => handleRoleChange(member.userId, GROUP_ROLE.GroupAdmin)}
                              disabled={mutating}
                            >
                              Make group admin
                            </button>
                          ) : null}
                          {canSetGroupModerator ? (
                            <button
                              className={styles.button}
                              type="button"
                              onClick={() => handleRoleChange(member.userId, GROUP_ROLE.GroupModerator)}
                              disabled={mutating}
                            >
                              Make group moderator
                            </button>
                          ) : null}
                          {canDemote ? (
                            <button
                              className={styles.button}
                              type="button"
                              onClick={() => handleRoleChange(member.userId, GROUP_ROLE.Member)}
                              disabled={mutating}
                            >
                              Make member
                            </button>
                          ) : null}
                          {canBan ? (
                            <button
                              className={styles.button}
                              type="button"
                              onClick={() => handleBanUser(member.userId)}
                              disabled={mutating}
                            >
                              Ban
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {members.length === 0 ? <p className={styles.muted}>No members loaded.</p> : null}
                </div>
              </Stack>
            </section>
          ) : null}

          {canModerate ? (
            <section className={styles.section}>
              <Stack className="gap-4">
                <h2 className={styles.sectionTitle}>Staff Chat</h2>
                <form
                  className={styles.form}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!staffMessage.trim() || !id) return;
                    setActionError('');
                    try {
                      await createStaffMessage(id, { content: staffMessage.trim() });
                      setStaffMessage('');
                    } catch (err) {
                      setActionError(err?.response?.data?.message || 'Could not send staff message.');
                    }
                  }}
                >
                  <textarea
                    className={styles.input}
                    rows={3}
                    placeholder="Share a note with admins/mods..."
                    value={staffMessage}
                    onChange={(e) => setStaffMessage(e.target.value)}
                  />
                  <button className={styles.button} type="submit" disabled={mutating}>
                    Send
                  </button>
                </form>
                <div className={styles.staffGrid}>
                  {staffMessages.map((message) => (
                    <article key={message.id} className={styles.staffMessage}>
                      <div className={styles.staffHeader}>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {message.authorName || message.authorId}
                        </p>
                        <p className={styles.muted}>{new Date(message.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{message.content}</p>
                    </article>
                  ))}
                  {staffMessages.length === 0 ? <p className={styles.muted}>No staff messages yet.</p> : null}
                </div>
              </Stack>
            </section>
          ) : null}

          <section className={styles.section}>
            <Stack className="gap-4">
              <h2 className={styles.sectionTitle}>Feed</h2>
              {postsLoading ? <p className={styles.muted}>Loading posts...</p> : null}
              {postsError ? <p className={styles.error}>Failed to load posts.</p> : null}
              {!postsLoading && !postsError ? (
                <div className={styles.posts}>
                  {posts.map((post) => (
                    <GroupPostCard key={post.id} post={post} />
                  ))}
                  {posts.length === 0 ? <p className={styles.muted}>No posts yet.</p> : null}
                </div>
              ) : null}
            </Stack>
          </section>
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default GroupDetailPage;
