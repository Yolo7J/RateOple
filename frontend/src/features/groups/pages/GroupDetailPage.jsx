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
import { EntityPicker, MultiEntityPicker } from '../../../shared/ui/EntityPicker';
import { searchMedia } from '../../media/services/mediaLookupService';
import Button from '../../../shared/ui/Button';
import Dialog from '../../../shared/ui/Dialog';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import PageHeader from '../../../shared/ui/PageHeader';
import Textarea from '../../../shared/ui/Textarea';

const styles = {
  pageStack: 'gap-6',
  description: 'text-[var(--text-secondary)]',
  muted: 'text-[var(--text-muted)]',
  controls: 'flex flex-wrap gap-2',
  button: 'ui-button',
  section: 'ui-card p-4 sm:p-6',
  sectionTitle: 'ui-section-title',
  form: 'grid gap-3 max-w-2xl',
  input: 'ui-input',
  pinnedGrid: 'gap-3',
  pinnedItem: 'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3',
  posts: 'grid gap-4',
  staffGrid: 'grid gap-3',
  staffMessage: 'ui-panel p-3',
  staffHeader: 'flex flex-wrap items-center justify-between gap-2',
  memberRow: 'ui-panel flex flex-wrap items-center justify-between gap-2 p-3',
  roleBadge: 'ui-badge',
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

  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [postMedia, setPostMedia] = useState([]);
  const [pinMedia, setPinMedia] = useState(null);
  const [staffMessage, setStaffMessage] = useState('');
  const [banTarget, setBanTarget] = useState(null);
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

    setActionError('');
    try {
      await createPost(id, {
        title: postForm.title.trim(),
        content: postForm.content.trim(),
        mediaIds: postMedia.map((item) => item.id),
      });
      setPostForm({ title: '', content: '' });
      setPostMedia([]);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not create post.');
    }
  };

  const handlePinMedia = async (e) => {
    e.preventDefault();
    if (!id || !pinMedia?.id) return;
    setActionError('');
    try {
      await addPinnedMedia(id, pinMedia.id);
      setPinMedia(null);
    } catch (err) {
      setActionError(err?.response?.data?.message || `Could not pin ${pinMedia.label}.`);
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

  const handleBanUser = async () => {
    if (!id) return;
    if (!banTarget) return;
    setActionError('');
    try {
      await banUser(id, { userId: banTarget.userId });
      setBanTarget(null);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not ban user.');
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <Container>
          <LoadingState label="Loading group..." />
        </Container>
      </PageLayout>
    );
  }

  if (error || !group) {
    return (
      <PageLayout>
        <Container>
          <InlineMessage tone="error">Group not found.</InlineMessage>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <Stack className="gap-2">
            <PageHeader
              title={group.name}
              subtitle={`${group.membersCount ?? 0} members · ${group.postsCount ?? 0} posts`}
            />
            {group.description ? <p className={styles.description}>{group.description}</p> : null}
          </Stack>

          {user ? (
            <div className={styles.controls}>
              {!isMember ? (
                <Button type="button" onClick={handleJoin} disabled={mutating}>
                  Join Group
                </Button>
              ) : null}
              {isMember && viewerRole !== GROUP_ROLE.Owner ? (
                <Button type="button" variant="ghost" onClick={handleLeave} disabled={mutating}>
                  Leave Group
                </Button>
              ) : null}
            </div>
          ) : null}

          {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}

          <section className={styles.section}>
            <Stack className="gap-4">
              <h2 className={styles.sectionTitle}>Pinned Media</h2>
              {canModerate ? (
                <form className={styles.form} onSubmit={handlePinMedia}>
                  <EntityPicker
                    label="Media to pin"
                    placeholder="Search media by title"
                    value={pinMedia}
                    onChange={setPinMedia}
                    searchFn={searchMedia}
                    disabled={mutating}
                  />
                  <Button type="submit" disabled={mutating || !pinMedia}>
                    Pin {pinMedia?.label ?? 'Media'}
                  </Button>
                </form>
              ) : null}
              <Grid cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" className={styles.pinnedGrid}>
                {pinned.map((item) => (
                  <article key={item.mediaId} className={styles.pinnedItem}>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                    <p className={styles.muted}>{new Date(item.addedAt).toLocaleDateString()}</p>
                  </article>
                ))}
                {pinned.length === 0 ? <EmptyState title="No pinned media yet" description="Moderators can pin media for group context." /> : null}
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
                  <Textarea
                    rows={4}
                    placeholder="Post content"
                    value={postForm.content}
                    onChange={(e) => setPostForm((prev) => ({ ...prev, content: e.target.value }))}
                    required
                  />
                  <MultiEntityPicker
                    label="Attached media"
                    placeholder="Search media by title"
                    value={postMedia}
                    onChange={setPostMedia}
                    searchFn={searchMedia}
                    disabled={mutating}
                    emptySelectionText="No media attached."
                  />
                  <Button type="submit" disabled={mutating}>
                    Publish Post
                  </Button>
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
                              onClick={() => setBanTarget(member)}
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
                  <Textarea
                    rows={3}
                    placeholder="Share a note with admins/mods..."
                    value={staffMessage}
                    onChange={(e) => setStaffMessage(e.target.value)}
                  />
                  <Button type="submit" disabled={mutating}>
                    Send
                  </Button>
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
                  {staffMessages.length === 0 ? <EmptyState title="No staff messages yet" /> : null}
                </div>
              </Stack>
            </section>
          ) : null}

          <section className={styles.section}>
            <Stack className="gap-4">
              <h2 className={styles.sectionTitle}>Feed</h2>
              {postsLoading ? <LoadingState label="Loading posts..." /> : null}
              {postsError ? <InlineMessage tone="error">Failed to load posts.</InlineMessage> : null}
              {!postsLoading && !postsError ? (
                <div className={styles.posts}>
                  {posts.map((post) => (
                    <GroupPostCard key={post.id} post={post} />
                  ))}
                  {posts.length === 0 ? <EmptyState title="No posts yet" description="Create the first post to start the group feed." /> : null}
                </div>
              ) : null}
            </Stack>
          </section>
          <Dialog
            open={Boolean(banTarget)}
            title="Ban group member?"
            description={`Ban ${banTarget?.userName || 'this user'} from ${group.name}?`}
            onClose={() => setBanTarget(null)}
            actions={(
              <>
                <Button variant="ghost" onClick={() => setBanTarget(null)}>Cancel</Button>
                <Button variant="danger" onClick={handleBanUser} disabled={mutating}>
                  {mutating ? 'Banning...' : 'Ban member'}
                </Button>
              </>
            )}
          />
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default GroupDetailPage;
