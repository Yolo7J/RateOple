import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mediaService from '../../services/mediaService';
import './MediaDetailPage.css';

const MediaDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [media, setMedia] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedSeasons, setExpandedSeasons] = useState({});

    useEffect(() => {
        setLoading(true);
        mediaService.getById(id)
            .then(r => setMedia(r.data))
            .catch(() => setError('Media not found.'))
            .finally(() => setLoading(false));
    }, [id]);

    const toggleSeason = (seasonId) =>
        setExpandedSeasons(prev => ({ ...prev, [seasonId]: !prev[seasonId] }));

    if (loading) return <div className="media-detail-loading">Loading…</div>;
    if (error || !media) return (
        <div className="media-detail-error">
            <p>{error ?? 'Not found.'}</p>
            <button onClick={() => navigate('/media')}>← Back to Media</button>
        </div>
    );

    const {
        type, title, description, coverUrl, releaseYear,
        averageRating, ratingsCount, genres,
        director, duration, author, pages, isbn,
        seasonsCount, seasons,
    } = media;

    return (
        <div className="media-detail-page">
            <button className="media-detail-back" onClick={() => navigate('/media')}>
                ← Back
            </button>

            <div className="media-detail-hero">
                <div className="media-detail-cover">
                    <img
                        src={coverUrl || 'https://via.placeholder.com/300x450?text=No+Cover'}
                        alt={title}
                        onError={e => { e.target.src = 'https://via.placeholder.com/300x450?text=No+Cover'; }}
                    />
                </div>

                <div className="media-detail-info">
                    <span className="media-detail-type-badge">{type === 'TvSeries' ? 'TV Series' : type}</span>
                    <h1 className="media-detail-title">{title}</h1>

                    <div className="media-detail-meta">
                        {releaseYear && <span>{releaseYear}</span>}
                        {duration && <span>{duration} min</span>}
                        {pages && <span>{pages} pages</span>}
                        {seasonsCount && <span>{seasonsCount} season{seasonsCount !== 1 ? 's' : ''}</span>}
                    </div>

                    {averageRating > 0 && (
                        <div className="media-detail-rating">
                            <span className="rating-star">★</span>
                            <span className="rating-value">{averageRating.toFixed(1)}</span>
                            <span className="rating-count">/ 10 · {ratingsCount} rating{ratingsCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}

                    {genres.length > 0 && (
                        <div className="media-detail-genres">
                            {genres.map(g => (
                                <span key={g} className="genre-tag">{g}</span>
                            ))}
                        </div>
                    )}

                    {/* Type-specific fields */}
                    {director && (
                        <div className="media-detail-field">
                            <span className="field-label">Director</span>
                            <span>{director}</span>
                        </div>
                    )}
                    {author && (
                        <div className="media-detail-field">
                            <span className="field-label">Author</span>
                            <span>{author}</span>
                        </div>
                    )}
                    {isbn && (
                        <div className="media-detail-field">
                            <span className="field-label">ISBN</span>
                            <span>{isbn}</span>
                        </div>
                    )}

                    {description && (
                        <p className="media-detail-description">{description}</p>
                    )}
                </div>
            </div>

            {/* Seasons & Episodes — TV Series only */}
            {type === 'TvSeries' && seasons.length > 0 && (
                <div className="media-seasons">
                    <h2 className="seasons-heading">Seasons & Episodes</h2>
                    {seasons.map(season => (
                        <div key={season.id} className="season-block">
                            <button
                                className="season-toggle"
                                onClick={() => toggleSeason(season.id)}
                            >
                                <span>Season {season.seasonNumber}</span>
                                <span className="season-episode-count">
                                    {season.episodes.length} episode{season.episodes.length !== 1 ? 's' : ''}
                                </span>
                                <span className="season-chevron">
                                    {expandedSeasons[season.id] ? '▲' : '▼'}
                                </span>
                            </button>

                            {expandedSeasons[season.id] && (
                                <div className="episodes-list">
                                    {season.episodes.map(ep => (
                                        <div key={ep.id} className="episode-row">
                                            <span className="ep-number">E{ep.episodeNumber}</span>
                                            <span className="ep-title">{ep.title}</span>
                                            {ep.duration && (
                                                <span className="ep-duration">{ep.duration} min</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MediaDetailPage;
