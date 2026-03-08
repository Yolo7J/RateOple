import { buildImageUrl } from '../../../shared/utils/buildImageUrl';
import './groups.css';

function GroupPostCard({ post }) {
  const media = Array.isArray(post.media) ? post.media : [];

  return (
    <article className="ro-group-post-card">
      <header>
        <h3>{post.title}</h3>
        <p className="ro-muted">{new Date(post.createdAt).toLocaleString()}</p>
      </header>
      <p>{post.content}</p>
      {media.length ? (
        <div className="ro-group-post-media">
          {media.map((item) => (
            <div key={item.mediaId} className="ro-group-post-media-item">
              <img src={buildImageUrl(item.coverUrl)} alt={item.title} />
              <span>{item.title}</span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default GroupPostCard;
