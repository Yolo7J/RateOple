import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGroupDetailsQuery } from '../queries/useGroupDetailsQuery';
import { useGroupPostsQuery } from '../queries/useGroupPostsQuery';
import { useGroupPinnedMediaQuery } from '../queries/useGroupPinnedMediaQuery';
import { useGroupMutations } from '../queries/useGroupMutations';
import GroupPostCard from '../components/GroupPostCard';
import '../components/groups.css';
import '../../../pages/pages.css';

function GroupDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: group, loading, error } = useGroupDetailsQuery(id);
  const { data: postsData, loading: postsLoading, error: postsError } = useGroupPostsQuery(id, { page: 1, pageSize: 30 });
  const { data: pinnedData } = useGroupPinnedMediaQuery(id);
  const { joinGroup, leaveGroup, createPost, addPinnedMedia, loading: mutating } = useGroupMutations();

  const posts = useMemo(() => (Array.isArray(postsData?.items) ? postsData.items : []), [postsData]);
  const pinned = Array.isArray(pinnedData) ? pinnedData : [];

  const [postForm, setPostForm] = useState({ title: '', content: '', mediaIds: '' });
  const [pinMediaId, setPinMediaId] = useState('');
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

  if (loading) return <main className="ro-page"><p>Loading group...</p></main>;
  if (error || !group) return <main className="ro-page"><p className="ro-error">Group not found.</p></main>;

  return (
    <main className="ro-page">
      <h1>{group.name}</h1>
      {group.description ? <p>{group.description}</p> : null}
      <p className="ro-muted">{group.membersCount ?? 0} members · {group.postsCount ?? 0} posts</p>

      {user ? (
        <div className="ro-group-actions">
          <button type="button" onClick={handleJoin} disabled={mutating}>Join Group</button>
          <button type="button" onClick={handleLeave} disabled={mutating}>Leave Group</button>
        </div>
      ) : null}

      {actionError ? <p className="ro-error">{actionError}</p> : null}

      <section className="ro-review-section">
        <h2>Pinned Media</h2>
        {user ? (
          <form className="ro-group-form" onSubmit={handlePinMedia}>
            <input
              placeholder="Media ID to pin"
              value={pinMediaId}
              onChange={(e) => setPinMediaId(e.target.value)}
            />
            <button type="submit" disabled={mutating}>Pin Media</button>
          </form>
        ) : null}
        <div className="ro-pinned-grid">
          {pinned.map((item) => (
            <article key={item.mediaId} className="ro-pinned-item">
              <p>{item.title}</p>
              <p className="ro-muted">{new Date(item.addedAt).toLocaleDateString()}</p>
            </article>
          ))}
          {pinned.length === 0 ? <p className="ro-muted">No pinned media yet.</p> : null}
        </div>
      </section>

      <section className="ro-review-section">
        <h2>Create Post</h2>
        {user ? (
          <form className="ro-group-form" onSubmit={handleCreatePost}>
            <input
              placeholder="Post title"
              value={postForm.title}
              onChange={(e) => setPostForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
            <textarea
              rows={4}
              placeholder="Post content"
              value={postForm.content}
              onChange={(e) => setPostForm((prev) => ({ ...prev, content: e.target.value }))}
              required
            />
            <input
              placeholder="Media IDs (comma separated, optional)"
              value={postForm.mediaIds}
              onChange={(e) => setPostForm((prev) => ({ ...prev, mediaIds: e.target.value }))}
            />
            <button type="submit" disabled={mutating}>Publish Post</button>
          </form>
        ) : (
          <p className="ro-muted">Join and sign in to create posts.</p>
        )}
      </section>

      <section className="ro-review-section">
        <h2>Feed</h2>
        {postsLoading ? <p>Loading posts...</p> : null}
        {postsError ? <p className="ro-error">Failed to load posts.</p> : null}
        {!postsLoading && !postsError ? (
          <div className="ro-group-posts">
            {posts.map((post) => (
              <GroupPostCard key={post.id} post={post} />
            ))}
            {posts.length === 0 ? <p className="ro-muted">No posts yet.</p> : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default GroupDetailPage;
