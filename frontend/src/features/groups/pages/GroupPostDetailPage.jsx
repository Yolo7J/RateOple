import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGroupPostQuery } from '../queries/useGroupPostQuery';
import { useGroupPostCommentsQuery } from '../queries/useGroupPostCommentsQuery';
import { useGroupMutations } from '../queries/useGroupMutations';
import { useGroupDetailsQuery } from '../queries/useGroupDetailsQuery';
import { useModerationMutations } from '../../moderation/queries/useModerationMutations';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';

const REPORT_TARGET = {
  Comment: 2,
};

const GROUP_ROLE = {
  Member: 1,
  GroupModerator: 2,
  GroupAdmin: 3,
  Owner: 4,
};

const styles = {
  pageStack: 'gap-6',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  muted: 'text-[var(--text-muted)]',
  error: 'text-[#ff7f7f]',
  meta: 'text-sm text-[var(--text-muted)]',
  section: [
    'rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]',
    'p-4 sm:p-6',
  ].join(' '),
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
  voteRow: 'flex flex-wrap items-center gap-2',
  voteCount: 'text-sm font-semibold text-[var(--text-primary)]',
  mediaGrid: 'mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2',
  mediaItem: 'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-2',
  mediaImage: 'mb-1 w-full rounded-md object-cover aspect-[2/3]',
  mediaTitle: 'text-xs text-[var(--text-secondary)]',
  form: 'grid gap-3',
  input: [
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  ].join(' '),
  comments: 'grid gap-3',
  commentCard: 'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3',
  commentHeader: 'flex flex-wrap items-center justify-between gap-2',
  commentMeta: 'text-xs text-[var(--text-muted)]',
  commentActions: 'flex flex-wrap gap-2',
  commentBody: 'text-sm text-[var(--text-secondary)]',
  replyIndent: 'ml-6 border-l border-[var(--border)] pl-4',
};

function GroupPostDetailPage() {
  const { groupId, postId } = useParams();
  const { user } = useAuth();
  const { data: group } = useGroupDetailsQuery(groupId);
  const { data: post, loading, error } = useGroupPostQuery(groupId, postId);
  const { data: commentsData, loading: commentsLoading, error: commentsError } = useGroupPostCommentsQuery(groupId, postId);
  const { votePost, createPostComment, deletePostComment, loading: mutating } = useGroupMutations();
  const { createReport } = useModerationMutations();

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [actionError, setActionError] = useState('');
  const viewerRole = group?.viewerRole ?? null;
  const canModerate = viewerRole === GROUP_ROLE.Owner || viewerRole === GROUP_ROLE.GroupAdmin || viewerRole === GROUP_ROLE.GroupModerator;

  const comments = Array.isArray(commentsData) ? commentsData : [];

  const commentTree = useMemo(() => {
    const byParent = new Map();
    comments.forEach((comment) => {
      const key = comment.parentCommentId ?? 'root';
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(comment);
    });
    return byParent;
  }, [comments]);

  const handleVote = async (value) => {
    if (!groupId || !postId) return;
    setActionError('');
    try {
      await votePost(groupId, postId, value);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not vote on this post.');
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!groupId || !postId || !commentText.trim()) return;

    setActionError('');
    try {
      await createPostComment(groupId, postId, {
        content: commentText.trim(),
        parentCommentId: replyTo,
      });
      setCommentText('');
      setReplyTo(null);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not post comment.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!groupId || !postId) return;
    setActionError('');
    try {
      await deletePostComment(groupId, postId, commentId);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not delete comment.');
    }
  };

  const handleReportComment = async (commentId) => {
    const reason = window.prompt('Why are you reporting this comment?');
    if (!reason) return;
    try {
      await createReport({ targetType: REPORT_TARGET.Comment, targetId: commentId, reason });
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not submit report.');
    }
  };

  const renderComments = (parentId = 'root', depth = 0) => {
    const items = commentTree.get(parentId) || [];
    return items.map((comment) => {
      const isAuthor = Boolean(user && comment.authorId === user.id);
      const canDelete = isAuthor || canModerate;
      return (
        <div key={comment.id} className={depth > 0 ? styles.replyIndent : undefined}>
          <article className={styles.commentCard}>
            <div className={styles.commentHeader}>
              <div>
                <p className={styles.commentMeta}>{comment.authorName || 'Anonymous'}</p>
                <p className={styles.commentMeta}>{new Date(comment.createdAt).toLocaleString()}</p>
              </div>
              <div className={styles.commentActions}>
                {user ? (
                  <button
                    className={styles.button}
                    type="button"
                    onClick={() => setReplyTo(comment.id)}
                  >
                    Reply
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    className={styles.button}
                    type="button"
                    disabled={mutating}
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    Delete
                  </button>
                ) : null}
                {user ? (
                  <button
                    className={styles.button}
                    type="button"
                    onClick={() => handleReportComment(comment.id)}
                  >
                    Report
                  </button>
                ) : null}
              </div>
            </div>
            <p className={styles.commentBody}>{comment.content}</p>
          </article>
          {renderComments(comment.id, depth + 1)}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <PageLayout>
        <Container>
          <p className={styles.muted}>Loading post...</p>
        </Container>
      </PageLayout>
    );
  }

  if (error || !post) {
    return (
      <PageLayout>
        <Container>
          <p className={styles.error}>Post not found.</p>
        </Container>
      </PageLayout>
    );
  }

  const media = Array.isArray(post.media) ? post.media : [];

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <Link className={styles.meta} to={`/groups/${groupId}`}>
            Back to group
          </Link>
          <section className={styles.section}>
            <Stack className="gap-3">
              <h1 className={styles.title}>{post.title}</h1>
              <p className={styles.meta}>{new Date(post.createdAt).toLocaleString()}</p>
              <p className="text-[var(--text-secondary)]">{post.content}</p>
              <div className={styles.voteRow}>
                <button className={styles.button} type="button" onClick={() => handleVote(1)} disabled={mutating}>
                  {post.userVote === 1 ? 'Upvoted' : 'Upvote'}
                </button>
                <button className={styles.button} type="button" onClick={() => handleVote(-1)} disabled={mutating}>
                  {post.userVote === -1 ? 'Downvoted' : 'Downvote'}
                </button>
                {user ? (
                  <button className={styles.button} type="button" onClick={() => handleVote(0)} disabled={mutating}>
                    Clear
                  </button>
                ) : null}
                <span className={styles.voteCount}>
                  {post.upvotes - post.downvotes} score · {post.commentCount ?? 0} comments
                </span>
              </div>
              {media.length ? (
                <div className={styles.mediaGrid}>
                  {media.map((item) => (
                    <div key={item.mediaId} className={styles.mediaItem}>
                      <img className={styles.mediaImage} src={buildImageUrl(item.coverUrl)} alt={item.title} />
                      <span className={styles.mediaTitle}>{item.title}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack className="gap-3">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Comments</h2>
              {user ? (
                <form className={styles.form} onSubmit={handleSubmitComment}>
                  {replyTo ? (
                    <p className={styles.meta}>
                      Replying to comment {replyTo}.{' '}
                      <button
                        className={styles.button}
                        type="button"
                        onClick={() => setReplyTo(null)}
                      >
                        Cancel
                      </button>
                    </p>
                  ) : null}
                  <textarea
                    className={styles.input}
                    rows={3}
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    required
                  />
                  <button className={styles.button} type="submit" disabled={mutating}>
                    Post comment
                  </button>
                </form>
              ) : (
                <p className={styles.muted}>Sign in to comment.</p>
              )}
              {commentsLoading ? <p className={styles.muted}>Loading comments...</p> : null}
              {commentsError ? <p className={styles.error}>Failed to load comments.</p> : null}
              {!commentsLoading && !commentsError ? (
                <div className={styles.comments}>
                  {renderComments()}
                  {comments.length === 0 ? <p className={styles.muted}>No comments yet.</p> : null}
                </div>
              ) : null}
              {actionError ? <p className={styles.error}>{actionError}</p> : null}
            </Stack>
          </section>
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default GroupPostDetailPage;
