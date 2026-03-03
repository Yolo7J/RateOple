import { useNavigate } from 'react-router-dom';
import './MediaCard.css';

const PLACEHOLDER = 'https://via.placeholder.com/200x300?text=No+Cover';

const TYPE_LABELS = {
    Movie: 'Film',
    Book: 'Book',
    TvSeries: 'Series',
};

const MediaCard = ({ media }) => {
    const navigate = useNavigate();
    const { id, type, title, releaseYear, coverUrl, averageRating, ratingsCount } = media;

    return (
        <div className="media-card" onClick={() => navigate(`/media/${id}`)}>
            <div className="media-card-cover">
                <img
                    src={coverUrl || PLACEHOLDER}
                    alt={title}
                    loading="lazy"
                    onError={(e) => { e.target.src = PLACEHOLDER; }}
                />
                <span className="media-card-type-badge">{TYPE_LABELS[type] ?? type}</span>
            </div>
            <div className="media-card-info">
                <h3 className="media-card-title">{title}</h3>
                <div className="media-card-meta">
                    {releaseYear && <span className="media-card-year">{releaseYear}</span>}
                    <span className="media-card-rating">
                        ★ {averageRating > 0 ? averageRating.toFixed(1) : '—'}
                        {ratingsCount > 0 && (
                            <span className="media-card-rating-count"> ({ratingsCount})</span>
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default MediaCard;
