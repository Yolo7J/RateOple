import { ArrowRight, MessageCircle, ThumbsUp, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import { formatDateTime, getPostAuthorLabel, pluralize } from '../utils/groupFormatters';

const PREVIEW_LIMIT = 260;

const getPreview = (content) => {
  const text = String(content ?? '').trim();
  if (text.length <= PREVIEW_LIMIT) return text;
  return `${text.slice(0, PREVIEW_LIMIT).trim()}...`;
};

function GroupPostCard({ post }) {
  const media = Array.isArray(post.media) ? post.media : [];
  const score = (Number(post.upvotes) || 0) - (Number(post.downvotes) || 0);
  const authorLabel = getPostAuthorLabel(post);

  return (
    <article className="group-post-card">
      <Link to={`/groups/${post.groupId}/posts/${post.id}`} className="group-post-card__link">
        <header className="group-post-card__header">
          <div className="group-post-card__avatar" aria-hidden="true">
            <UserRound />
          </div>
          <div>
            <p className="group-post-card__meta">
              <span>{authorLabel}</span>
              {post.createdAt ? <span>{formatDateTime(post.createdAt)}</span> : null}
            </p>
            <h3>{post.title}</h3>
          </div>
        </header>

        {post.content ? <p className="group-post-card__preview">{getPreview(post.content)}</p> : null}

        {media.length ? (
          <div className="group-post-card__media" aria-label="Linked media">
            {media.slice(0, 3).map((item) => (
              <div key={item.mediaId} className="group-post-card__media-item">
                {item.coverUrl ? (
                  <img src={buildImageUrl(item.coverUrl)} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span aria-hidden="true" />
                )}
                <strong>{item.title}</strong>
              </div>
            ))}
            {media.length > 3 ? <span className="group-post-card__more">+{media.length - 3}</span> : null}
          </div>
        ) : null}

        <footer className="group-post-card__footer">
          <span><ThumbsUp aria-hidden="true" /> {score} score</span>
          <span><MessageCircle aria-hidden="true" /> {pluralize(post.commentCount, 'comment')}</span>
          <span className="group-post-card__open">
            Open discussion
            <ArrowRight aria-hidden="true" />
          </span>
        </footer>
      </Link>
    </article>
  );
}

export default GroupPostCard;
