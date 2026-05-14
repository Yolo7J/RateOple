import {
  ArrowLeft,
  BookOpen,
  Crown,
  Lock,
  MessageSquarePlus,
  Pin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import Container from '../../../shared/ui/Container';
import Dialog from '../../../shared/ui/Dialog';
import EmptyState from '../../../shared/ui/EmptyState';
import { EntityPicker, MultiEntityPicker } from '../../../shared/ui/EntityPicker';
import FormField from '../../../shared/ui/FormField';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import { Skeleton } from '../../../shared/ui/LoadingState';
import Textarea from '../../../shared/ui/Textarea';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import { useAuth } from '../../../context/AuthContext';
import PageLayout from '../../../layouts/PageLayout';
import GroupPostCard from '../components/GroupPostCard';
import { useGroupDetailsQuery } from '../queries/useGroupDetailsQuery';
import { useGroupMembersQuery } from '../queries/useGroupMembersQuery';
import { useGroupMutations } from '../queries/useGroupMutations';
import { useGroupPinnedMediaQuery } from '../queries/useGroupPinnedMediaQuery';
import { useGroupPostsQuery } from '../queries/useGroupPostsQuery';
import { useGroupStaffMessagesQuery } from '../queries/useGroupStaffMessagesQuery';
import {
  canManageGroupRoles,
  canModerateGroup,
  formatDate,
  formatDateTime,
  formatRoleLabel,
  formatVisibilityLabel,
  getRoleValue,
  GROUP_ROLE,
  isPublicGroup,
  pluralize,
} from '../utils/groupFormatters';
import { searchMedia } from '../../media/services/mediaLookupService';
import '../groups.css';

function GroupDetailSkeleton() {
  return (
    <PageLayout className="groups-page">
      <Container size="xxl">
        <div className="group-detail-shell">
          <section className="group-detail-hero group-detail-hero--loading" aria-label="Loading group">
            <Skeleton className="group-detail-loading__title" />
            <Skeleton className="group-detail-loading__line" />
            <Skeleton className="group-detail-loading__line short" />
          </section>
          <div className="group-detail-layout">
            <div className="group-detail-main">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="group-detail-loading__card" />
              ))}
            </div>
            <aside className="group-detail-sidebar">
              <Skeleton className="group-detail-loading__card" />
            </aside>
          </div>
        </div>
      </Container>
    </PageLayout>
  );
}

function GroupDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: group, loading, error } = useGroupDetailsQuery(id);
  const { data: postsData, loading: postsLoading, error: postsError } = useGroupPostsQuery(id, { page: 1, pageSize: 30 });
  const { data: pinnedData } = useGroupPinnedMediaQuery(id);
  const { joinGroup, leaveGroup, createPost, addPinnedMedia, setMemberRole, transferOwnership, banUser, createStaffMessage, loading: mutating } = useGroupMutations();

  const viewerRole = group?.viewerRole ?? null;
  const viewerRoleValue = getRoleValue(viewerRole);
  const isMember = Boolean(viewerRoleValue);
  const isArchived = Boolean(group?.isArchived);
  const canManageRoles = canManageGroupRoles(viewerRole);
  const hasWritableAccount = Boolean(user && !user.isReadOnly);
  const canModerate = hasWritableAccount && !isArchived && canModerateGroup(viewerRole);
  const canCreatePost = Boolean(hasWritableAccount && !isArchived && isMember);
  const canJoin = Boolean(hasWritableAccount && !isArchived && group && !isMember && isPublicGroup(group));

  const { data: membersData, isLoading: membersLoading, error: membersError } = useGroupMembersQuery(id, canManageRoles);
  const { data: staffData, isLoading: staffLoading, error: staffError } = useGroupStaffMessagesQuery(id, canModerate);

  const posts = useMemo(() => (Array.isArray(postsData?.items) ? postsData.items : []), [postsData]);
  const pinned = Array.isArray(pinnedData) ? pinnedData : [];
  const members = Array.isArray(membersData) ? membersData : [];
  const staffMessages = Array.isArray(staffData) ? staffData : [];

  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [postMedia, setPostMedia] = useState([]);
  const [pinMedia, setPinMedia] = useState(null);
  const [staffMessage, setStaffMessage] = useState('');
  const [banTarget, setBanTarget] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
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

  const handleCreatePost = async (event) => {
    event.preventDefault();
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

  const handlePinMedia = async (event) => {
    event.preventDefault();
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
    if (!id || !userId) return;
    setActionError('');
    try {
      await setMemberRole(id, userId, role);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not update role.');
    }
  };

  const handleTransferOwnership = async () => {
    if (!id || !transferTarget?.userId) return;
    setActionError('');
    try {
      await transferOwnership(id, transferTarget.userId);
      setTransferTarget(null);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not transfer ownership.');
    }
  };

  const handleBanUser = async () => {
    if (!id || !banTarget?.userId) return;
    setActionError('');
    try {
      await banUser(id, { userId: banTarget.userId });
      setBanTarget(null);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not ban user.');
    }
  };

  const handleStaffMessage = async (event) => {
    event.preventDefault();
    if (!staffMessage.trim() || !id) return;
    setActionError('');
    try {
      await createStaffMessage(id, { content: staffMessage.trim() });
      setStaffMessage('');
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not send staff message.');
    }
  };

  if (loading) return <GroupDetailSkeleton />;

  if (error || !group) {
    return (
      <PageLayout className="groups-page">
        <Container size="lg">
          <InlineMessage tone="error">Group not found.</InlineMessage>
        </Container>
      </PageLayout>
    );
  }

  const visibilityLabel = formatVisibilityLabel(group.visibility);
  const roleLabel = formatRoleLabel(viewerRole);

  return (
    <PageLayout className="groups-page">
      <Container size="xxl">
        <div className="group-detail-shell">
          <Link className="groups-back-link" to="/groups">
            <ArrowLeft aria-hidden="true" />
            Groups
          </Link>

          <section className="group-detail-hero" aria-labelledby="group-detail-title">
            <div className="group-detail-hero__content">
              <div className="group-detail-hero__badges">
                <Badge tone={visibilityLabel === 'Private' ? 'warning' : 'success'}>
                  {visibilityLabel === 'Private' ? <Lock aria-hidden="true" /> : <Users aria-hidden="true" />}
                  {visibilityLabel}
                </Badge>
                {roleLabel ? (
                  <Badge tone={viewerRoleValue === GROUP_ROLE.Owner ? 'accent' : canModerate ? 'info' : 'success'}>
                    {viewerRoleValue === GROUP_ROLE.Owner ? (
                      <Crown aria-hidden="true" />
                    ) : canModerate ? (
                      <ShieldCheck aria-hidden="true" />
                    ) : null}
                    {roleLabel}
                  </Badge>
                ) : null}
                {isArchived ? (
                  <Badge tone="warning">
                    <Lock aria-hidden="true" />
                    Archived
                  </Badge>
                ) : null}
              </div>
              <h1 id="group-detail-title">{group.name}</h1>
              <p>{group.description || 'This group has not added a description yet.'}</p>
              <dl className="group-detail-stats" aria-label={`${group.name} statistics`}>
                <div>
                  <dt>Members</dt>
                  <dd>{pluralize(group.membersCount, 'member')}</dd>
                </div>
                <div>
                  <dt>Posts</dt>
                  <dd>{pluralize(group.postsCount, 'post')}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(group.createdAt) || 'Unavailable'}</dd>
                </div>
              </dl>
            </div>

            <div className="group-detail-hero__actions">
              {canJoin ? (
                <Button type="button" variant="primary" size="lg" onClick={handleJoin} disabled={mutating}>
                  <Users aria-hidden="true" />
                  {mutating ? 'Joining...' : 'Join group'}
                </Button>
              ) : null}
              {isMember && viewerRoleValue !== GROUP_ROLE.Owner ? (
                <Button type="button" variant="ghost" size="lg" onClick={handleLeave} disabled={mutating}>
                  Leave group
                </Button>
              ) : null}
              {canCreatePost ? (
                <Button as="a" href="#group-create-post" size="lg">
                  <MessageSquarePlus aria-hidden="true" />
                  Create post
                </Button>
              ) : null}
              {!user ? (
                <Button as={Link} to="/login" size="lg">
                  Sign in to join
                </Button>
              ) : null}
            </div>
          </section>

          {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}
          {isArchived ? <InlineMessage tone="warning">This group is archived and read-only.</InlineMessage> : null}

          <div className="group-detail-layout">
            <main className="group-detail-main">
              <section id="group-create-post" className="group-section" aria-labelledby="group-create-post-title">
                <div className="group-section__header">
                  <div>
                    <span className="groups-eyebrow">Start a thread</span>
                    <h2 id="group-create-post-title">Create post</h2>
                  </div>
                </div>

                {canCreatePost ? (
                  <form className="group-form" onSubmit={handleCreatePost}>
                    <FormField label="Post title">
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          maxLength={160}
                          placeholder="What should the group discuss?"
                          value={postForm.title}
                          onChange={(event) => setPostForm((prev) => ({ ...prev, title: event.target.value }))}
                          required
                        />
                      )}
                    </FormField>
                    <FormField label="Post content">
                      {(fieldProps) => (
                        <Textarea
                          {...fieldProps}
                          rows={5}
                          maxLength={8000}
                          placeholder="Share your take, question, theory, or recommendation..."
                          value={postForm.content}
                          onChange={(event) => setPostForm((prev) => ({ ...prev, content: event.target.value }))}
                          required
                        />
                      )}
                    </FormField>
                    <MultiEntityPicker
                      label="Linked media"
                      placeholder="Search media by title"
                      value={postMedia}
                      onChange={setPostMedia}
                      searchFn={searchMedia}
                      disabled={mutating}
                      emptySelectionText="No media linked."
                    />
                    <div className="group-form__actions">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={mutating || !postForm.title.trim() || !postForm.content.trim()}
                      >
                        {mutating ? 'Publishing...' : 'Publish post'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <EmptyState
                    title={isArchived ? 'Group archived' : user ? 'Join to start a discussion' : 'Sign in to start a discussion'}
                    description={isArchived ? 'Archived groups are read-only.' : user ? 'Members can create posts and link movies, TV series, or books.' : 'Create an account or sign in before posting to groups.'}
                    action={canJoin ? (
                      <Button type="button" variant="primary" onClick={handleJoin} disabled={mutating}>
                        Join group
                      </Button>
                    ) : !user ? (
                      <Button as={Link} to="/login">Sign in</Button>
                    ) : null}
                  />
                )}
              </section>

              <section className="group-section" aria-labelledby="group-feed-title">
                <div className="group-section__header">
                  <div>
                    <span className="groups-eyebrow">Discussion feed</span>
                    <h2 id="group-feed-title">Posts</h2>
                    <p>{postsLoading ? 'Loading posts...' : pluralize(postsData?.totalCount ?? posts.length, 'post')}</p>
                  </div>
                </div>

                {postsError ? <InlineMessage tone="error">Failed to load posts.</InlineMessage> : null}
                {postsLoading ? (
                  <div className="group-feed-list" aria-label="Loading posts">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="group-post-skeleton" />
                    ))}
                  </div>
                ) : null}
                {!postsLoading && !postsError ? (
                  <div className="group-feed-list">
                    {posts.map((post) => (
                      <GroupPostCard key={post.id} post={post} />
                    ))}
                    {posts.length === 0 ? (
                      <EmptyState
                        title="No posts yet"
                        description="Start the first discussion for this group."
                        action={canCreatePost ? (
                          <Button as="a" href="#group-create-post" variant="primary">
                            Create post
                          </Button>
                        ) : null}
                      />
                    ) : null}
                  </div>
                ) : null}
              </section>
            </main>

            <aside className="group-detail-sidebar" aria-label="Group information">
              <section className="group-section group-section--compact" aria-labelledby="group-about-title">
                <div className="group-section__header">
                  <div>
                    <span className="groups-eyebrow">About</span>
                    <h2 id="group-about-title">Group info</h2>
                  </div>
                </div>
                <dl className="group-info-list">
                  <div>
                    <dt>Visibility</dt>
                    <dd>{visibilityLabel}</dd>
                  </div>
                  <div>
                    <dt>Members</dt>
                    <dd>{pluralize(group.membersCount, 'member')}</dd>
                  </div>
                  <div>
                    <dt>Posts</dt>
                    <dd>{pluralize(group.postsCount, 'post')}</dd>
                  </div>
                  {roleLabel ? (
                    <div>
                      <dt>Your role</dt>
                      <dd>{roleLabel}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section className="group-section group-section--compact" aria-labelledby="group-pinned-title">
                <div className="group-section__header">
                  <div>
                    <span className="groups-eyebrow">Context</span>
                    <h2 id="group-pinned-title">Pinned media</h2>
                  </div>
                </div>
                {canModerate ? (
                  <form className="group-form group-form--compact" onSubmit={handlePinMedia}>
                    <EntityPicker
                      label="Media to pin"
                      placeholder="Search media by title"
                      value={pinMedia}
                      onChange={setPinMedia}
                      searchFn={searchMedia}
                      disabled={mutating}
                    />
                    <Button type="submit" disabled={mutating || !pinMedia}>
                      <Pin aria-hidden="true" />
                      Pin media
                    </Button>
                  </form>
                ) : null}

                {pinned.length > 0 ? (
                  <div className="group-pinned-list">
                    {pinned.map((item) => (
                      <Link key={item.mediaId} className="group-pinned-card" to={`/media/${item.mediaId}`}>
                        <div className="group-pinned-card__cover">
                          {item.coverUrl ? (
                            <img src={buildImageUrl(item.coverUrl)} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <BookOpen aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <strong>{item.title}</strong>
                          {item.addedAt ? <span>Pinned {formatDate(item.addedAt)}</span> : null}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No pinned media yet" description="Pinned movies, TV series, and books will appear here." />
                )}
              </section>
            </aside>
          </div>

          {canManageRoles ? (
            <section className="group-section" aria-labelledby="group-members-title">
              <div className="group-section__header">
                <div>
                  <span className="groups-eyebrow">Owner tools</span>
                  <h2 id="group-members-title">Members</h2>
                </div>
              </div>
              {membersError ? <InlineMessage tone="error">Failed to load members.</InlineMessage> : null}
              {membersLoading ? <Skeleton className="group-admin-skeleton" /> : null}
              {!membersLoading && !membersError ? (
                <div className="group-member-list">
                  {members.map((member) => {
                    const memberRole = getRoleValue(member.role);
                    const canSetGroupAdmin = viewerRoleValue === GROUP_ROLE.Owner && memberRole !== GROUP_ROLE.Owner;
                    const canSetGroupModerator =
                      memberRole !== GROUP_ROLE.Owner &&
                      (viewerRoleValue === GROUP_ROLE.Owner || viewerRoleValue === GROUP_ROLE.GroupAdmin);
                    const canDemote =
                      memberRole !== GROUP_ROLE.Owner &&
                      (viewerRoleValue === GROUP_ROLE.Owner || viewerRoleValue === GROUP_ROLE.GroupAdmin);
                    const canBan =
                      !isArchived &&
                      memberRole !== GROUP_ROLE.Owner &&
                      (viewerRoleValue === GROUP_ROLE.Owner ||
                        (viewerRoleValue === GROUP_ROLE.GroupAdmin && memberRole !== GROUP_ROLE.GroupAdmin && memberRole !== GROUP_ROLE.GroupModerator));
                    const canTransferOwnership =
                      !isArchived &&
                      viewerRoleValue === GROUP_ROLE.Owner &&
                      memberRole !== GROUP_ROLE.Owner &&
                      member.userId;

                    return (
                      <article key={member.userId ?? member.userName} className="group-member-row">
                        <div>
                          <strong>{member.userName || member.userId}</strong>
                          <span>{formatRoleLabel(member.role)} · Joined {formatDate(member.joinedAt) || 'unknown date'}</span>
                        </div>
                        <div className="group-member-row__actions">
                          {canSetGroupAdmin ? (
                            <Button size="sm" type="button" onClick={() => handleRoleChange(member.userId, GROUP_ROLE.GroupAdmin)} disabled={mutating || !member.userId}>
                              Make admin
                            </Button>
                          ) : null}
                          {canSetGroupModerator ? (
                            <Button size="sm" type="button" onClick={() => handleRoleChange(member.userId, GROUP_ROLE.GroupModerator)} disabled={mutating || !member.userId}>
                              Make moderator
                            </Button>
                          ) : null}
                          {canDemote ? (
                            <Button size="sm" type="button" onClick={() => handleRoleChange(member.userId, GROUP_ROLE.Member)} disabled={mutating || !member.userId}>
                              Make member
                            </Button>
                          ) : null}
                          {canTransferOwnership ? (
                            <Button size="sm" type="button" onClick={() => setTransferTarget(member)} disabled={mutating}>
                              Transfer owner
                            </Button>
                          ) : null}
                          {canBan ? (
                            <Button size="sm" type="button" variant="danger" onClick={() => setBanTarget(member)} disabled={mutating || !member.userId}>
                              Ban
                            </Button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                  {members.length === 0 ? <EmptyState title="No members loaded" /> : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {canModerate ? (
            <section className="group-section" aria-labelledby="group-staff-title">
              <div className="group-section__header">
                <div>
                  <span className="groups-eyebrow">Moderator space</span>
                  <h2 id="group-staff-title">Staff chat</h2>
                </div>
              </div>
              <form className="group-form" onSubmit={handleStaffMessage}>
                <FormField label="Staff message">
                  {(fieldProps) => (
                    <Textarea
                      {...fieldProps}
                      rows={3}
                      maxLength={4000}
                      placeholder="Share a note with admins and moderators..."
                      value={staffMessage}
                      onChange={(event) => setStaffMessage(event.target.value)}
                    />
                  )}
                </FormField>
                <div className="group-form__actions">
                  <Button type="submit" disabled={mutating || !staffMessage.trim()}>
                    Send message
                  </Button>
                </div>
              </form>
              {staffError ? <InlineMessage tone="error">Failed to load staff messages.</InlineMessage> : null}
              {staffLoading ? <Skeleton className="group-admin-skeleton" /> : null}
              {!staffLoading && !staffError ? (
                <div className="group-staff-list">
                  {staffMessages.map((message) => (
                    <article key={message.id} className="group-staff-message">
                      <header>
                        <strong>{message.authorName || message.authorId}</strong>
                        <span>{formatDateTime(message.createdAt)}</span>
                      </header>
                      <p>{message.content}</p>
                    </article>
                  ))}
                  {staffMessages.length === 0 ? <EmptyState title="No staff messages yet" /> : null}
                </div>
              ) : null}
            </section>
          ) : null}

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
          <Dialog
            open={Boolean(transferTarget)}
            title="Transfer ownership?"
            description={`Make ${transferTarget?.userName || 'this member'} the owner of ${group.name}? You will become a group admin.`}
            onClose={() => setTransferTarget(null)}
            actions={(
              <>
                <Button variant="ghost" onClick={() => setTransferTarget(null)}>Cancel</Button>
                <Button variant="danger" onClick={handleTransferOwnership} disabled={mutating}>
                  {mutating ? 'Transferring...' : 'Transfer ownership'}
                </Button>
              </>
            )}
          />
        </div>
      </Container>
    </PageLayout>
  );
}

export default GroupDetailPage;
