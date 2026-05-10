import {
  ArrowLeft,
  BookOpen,
  Flag,
  MessageCircle,
  Reply,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../../shared/ui/Button';
import Container from '../../../shared/ui/Container';
import Dialog from '../../../shared/ui/Dialog';
import EmptyState from '../../../shared/ui/EmptyState';
import FormField from '../../../shared/ui/FormField';
import InlineMessage from '../../../shared/ui/InlineMessage';
import { Skeleton } from '../../../shared/ui/LoadingState';
import Textarea from '../../../shared/ui/Textarea';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import { useAuth } from '../../../context/AuthContext';
import { useModerationMutations } from '../../moderation/queries/useModerationMutations';
import PageLayout from '../../../layouts/PageLayout';
import { useGroupDetailsQuery } from '../queries/useGroupDetailsQuery';
import { useGroupMutations } from '../queries/useGroupMutations';
import { useGroupPostCommentsQuery } from '../queries/useGroupPostCommentsQuery';
import { useGroupPostQuery } from '../queries/useGroupPostQuery';
import {
  canModerateGroup,
  formatDateTime,
  getCommentAuthorLabel,
  getPostAuthorLabel,
  getRoleValue,
  pluralize,
} from '../utils/groupFormatters';
import '../groups.css';

const REPORT_TARGET = {
  Comment: 2,
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [actionError, setActionError] = useState('');

  const viewerRole = group?.viewerRole ?? null;
  const isMember = Boolean(getRoleValue(viewerRole));
  const canModerate = canModerateGroup(viewerRole);
  const canInteract = Boolean(user && isMember);
  const comments = useMemo(() => (Array.isArray(commentsData) ? commentsData : []), [commentsData]);
  const media = Array.isArray(post?.media) ? post.media : [];
  const score = (Number(post?.upvotes) || 0) - (Number(post?.downvotes) || 0);
  const replyTarget = useMemo(() => comments.find((comment) => comment.id === replyTo), [comments, replyTo]);

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
    if (!groupId || !postId || !canInteract) return;
    setActionError('');
    try {
      await votePost(groupId, postId, value);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not vote on this post.');
    }
  };

  const handleSubmitComment = async (event) => {
    event.preventDefault();
    if (!groupId || !postId || !commentText.trim() || !canInteract) return;

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

  const handleDeleteComment = async () => {
    if (!groupId || !postId || !deleteTarget) return;
    setActionError('');
    try {
      await deletePostComment(groupId, postId, deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not delete comment.');
    }
  };

  const handleReportComment = async () => {
    if (!reportTarget || !reportReason.trim()) return;
    setActionError('');
    try {
      await createReport({ targetType: REPORT_TARGET.Comment, targetId: reportTarget.id, reason: reportReason.trim() });
      setReportTarget(null);
      setReportReason('');
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not submit report.');
    }
  };

  const renderComments = (parentId = 'root', depth = 0) => {
    const items = commentTree.get(parentId) || [];

    return items.map((comment) => {
      const authorLabel = getCommentAuthorLabel(comment);
      const authorId = comment.authorId ?? comment.userId;
      const isAuthor = Boolean(
        user?.id &&
        authorId &&
        String(authorId).toLowerCase() === String(user.id).toLowerCase(),
      );
      const canDelete = isAuthor || canModerate;
      const avatarUrl = comment.avatarUrl ? buildImageUrl(comment.avatarUrl) : null;

      return (
        <div key={comment.id} className={depth > 0 ? 'group-comment-thread' : undefined}>
          <article className="group-comment-card">
            <header className="group-comment-card__header">
              <div className="group-comment-card__author">
                <div className="group-comment-card__avatar" aria-hidden="true">
                  {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound />}
                </div>
                <div>
                  <strong>{authorLabel}</strong>
                  <span>{formatDateTime(comment.createdAt)}</span>
                </div>
              </div>
              <div className="group-comment-card__actions">
                {canInteract ? (
                  <Button size="sm" type="button" onClick={() => setReplyTo(comment.id)}>
                    <Reply aria-hidden="true" />
                    Reply
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button size="sm" type="button" variant="danger" disabled={mutating} onClick={() => setDeleteTarget(comment)}>
                    <Trash2 aria-hidden="true" />
                    Delete
                  </Button>
                ) : null}
                {user ? (
                  <Button size="sm" type="button" onClick={() => setReportTarget(comment)}>
                    <Flag aria-hidden="true" />
                    Report
                  </Button>
                ) : null}
              </div>
            </header>
            <p>{comment.content}</p>
          </article>
          {renderComments(comment.id, depth + 1)}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <PageLayout className="groups-page">
        <Container size="xxl">
          <div className="group-post-shell">
            <Skeleton className="group-post-loading__hero" />
            <Skeleton className="group-post-loading__comments" />
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (error || !post) {
    return (
      <PageLayout className="groups-page">
        <Container size="lg">
          <InlineMessage tone="error">Post not found.</InlineMessage>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="groups-page">
      <Container size="xxl">
        <div className="group-post-shell">
          <nav className="group-breadcrumb" aria-label="Group post breadcrumb">
            <Link to="/groups">Groups</Link>
            <Link to={`/groups/${groupId}`}>{group?.name || 'Group'}</Link>
            <span>{post.title}</span>
          </nav>

          <article className="group-post-article">
            <Link className="groups-back-link" to={`/groups/${groupId}`}>
              <ArrowLeft aria-hidden="true" />
              Back to group
            </Link>
            <header className="group-post-article__header">
              <div className="group-post-article__meta">
                <span>{getPostAuthorLabel(post)}</span>
                {post.createdAt ? <span>{formatDateTime(post.createdAt)}</span> : null}
              </div>
              <h1>{post.title}</h1>
            </header>

            <p className="group-post-article__body">{post.content}</p>

            {media.length ? (
              <div className="group-post-media-grid" aria-label="Linked media">
                {media.map((item) => (
                  <Link key={item.mediaId} className="group-post-media-card" to={`/media/${item.mediaId}`}>
                    <div>
                      {item.coverUrl ? (
                        <img src={buildImageUrl(item.coverUrl)} alt="" />
                      ) : (
                        <BookOpen aria-hidden="true" />
                      )}
                    </div>
                    <strong>{item.title}</strong>
                  </Link>
                ))}
              </div>
            ) : null}

            <footer className="group-post-article__footer">
              {canInteract ? (
                <div className="group-vote-row" aria-label="Post voting">
                  <Button
                    size="sm"
                    type="button"
                    aria-pressed={post.userVote === 1}
                    onClick={() => handleVote(1)}
                    disabled={mutating}
                  >
                    <ThumbsUp aria-hidden="true" />
                    {post.userVote === 1 ? 'Upvoted' : 'Upvote'}
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    aria-pressed={post.userVote === -1}
                    onClick={() => handleVote(-1)}
                    disabled={mutating}
                  >
                    <ThumbsDown aria-hidden="true" />
                    {post.userVote === -1 ? 'Downvoted' : 'Downvote'}
                  </Button>
                  {post.userVote ? (
                    <Button size="sm" type="button" variant="ghost" onClick={() => handleVote(0)} disabled={mutating}>
                      Clear vote
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="group-post-article__note">
                  {user ? 'Join the group to vote or comment.' : 'Sign in and join the group to vote or comment.'}
                </p>
              )}
              <div className="group-post-article__stats">
                <span><ThumbsUp aria-hidden="true" /> {score} score</span>
                <span><MessageCircle aria-hidden="true" /> {pluralize(post.commentCount, 'comment')}</span>
              </div>
            </footer>
          </article>

          <section className="group-section" aria-labelledby="group-comments-title">
            <div className="group-section__header">
              <div>
                <span className="groups-eyebrow">Replies</span>
                <h2 id="group-comments-title">Comments</h2>
                <p>{commentsLoading ? 'Loading comments...' : pluralize(comments.length, 'comment')}</p>
              </div>
            </div>

            {canInteract ? (
              <form className="group-form group-comment-form" onSubmit={handleSubmitComment}>
                {replyTo ? (
                  <div className="group-reply-context">
                    Replying to {replyTarget ? getCommentAuthorLabel(replyTarget) : 'a comment'}
                    <Button size="sm" type="button" variant="ghost" onClick={() => setReplyTo(null)}>
                      Cancel reply
                    </Button>
                  </div>
                ) : null}
                <FormField label={replyTo ? 'Reply' : 'Comment'}>
                  {(fieldProps) => (
                    <Textarea
                      {...fieldProps}
                      rows={3}
                      maxLength={4000}
                      placeholder="Write a thoughtful reply..."
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      required
                    />
                  )}
                </FormField>
                <div className="group-form__actions">
                  <Button type="submit" variant="primary" disabled={mutating || !commentText.trim()}>
                    Post comment
                  </Button>
                </div>
              </form>
            ) : (
              <InlineMessage tone="info">
                {user ? 'Join this group before commenting.' : 'Sign in before commenting.'}
              </InlineMessage>
            )}

            {commentsLoading ? (
              <div className="group-comments-list" aria-label="Loading comments">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="group-comment-skeleton" />
                ))}
              </div>
            ) : null}
            {commentsError ? <InlineMessage tone="error">Failed to load comments.</InlineMessage> : null}
            {!commentsLoading && !commentsError ? (
              <div className="group-comments-list">
                {renderComments()}
                {comments.length === 0 ? (
                  <EmptyState title="No comments yet" description="Start the discussion with the first comment." />
                ) : null}
              </div>
            ) : null}
            {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}
          </section>

          <Dialog
            open={Boolean(deleteTarget)}
            title="Delete comment?"
            description="This removes the comment from the discussion."
            onClose={() => setDeleteTarget(null)}
            actions={(
              <>
                <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button variant="danger" onClick={handleDeleteComment} disabled={mutating}>
                  {mutating ? 'Deleting...' : 'Delete comment'}
                </Button>
              </>
            )}
          />
          <Dialog
            open={Boolean(reportTarget)}
            title="Report comment"
            description="Tell the moderation team what needs attention."
            onClose={() => {
              setReportTarget(null);
              setReportReason('');
            }}
            actions={(
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setReportTarget(null);
                    setReportReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleReportComment} disabled={!reportReason.trim()}>
                  Submit report
                </Button>
              </>
            )}
          >
            <FormField label="Reason for report">
              {(fieldProps) => (
                <Textarea
                  {...fieldProps}
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  placeholder="What should moderators review?"
                  rows={4}
                />
              )}
            </FormField>
          </Dialog>
        </div>
      </Container>
    </PageLayout>
  );
}

export default GroupPostDetailPage;
