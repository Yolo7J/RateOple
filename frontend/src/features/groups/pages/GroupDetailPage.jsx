import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGroupDetailsQuery } from '../queries/useGroupDetailsQuery';
import { useGroupPostsQuery } from '../queries/useGroupPostsQuery';
import { useGroupPinnedMediaQuery } from '../queries/useGroupPinnedMediaQuery';
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
};

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
              <button className={styles.button} type="button" onClick={handleJoin} disabled={mutating}>
                Join Group
              </button>
              <button className={styles.button} type="button" onClick={handleLeave} disabled={mutating}>
                Leave Group
              </button>
            </div>
          ) : null}

          {actionError ? <p className={styles.error}>{actionError}</p> : null}

          <section className={styles.section}>
            <Stack className="gap-4">
              <h2 className={styles.sectionTitle}>Pinned Media</h2>
              {user ? (
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
              {user ? (
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
                <p className={styles.muted}>Join and sign in to create posts.</p>
              )}
            </Stack>
          </section>

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
