import { useNavigate } from 'react-router-dom';
import './discovery.css';

function MediaCard({ media }) {
    const navigate = useNavigate();

    return (
        <article className="ro-discovery-card" onClick={() => navigate(`/media/${media.id}`)}>
            <img src={media.coverUrl || 'https://placehold.co/220x330?text=No+Image'} alt={media.title} />
            <div className="meta">
                <h3>{media.title}</h3>
                <p>{media.releaseYear ?? 'N/A'} · {media.averageRating > 0 ? media.averageRating.toFixed(1) : '—'}</p>
            </div>
        </article>
    );
}

export default MediaCard;
