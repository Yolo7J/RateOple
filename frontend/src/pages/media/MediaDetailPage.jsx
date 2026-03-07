import { useEffect, useState } from "react";
import api from "../../services/api"; 
import { useParams, useNavigate } from "react-router-dom";
import "./MediaDetailPage.css";

export default function MediaDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [media, setMedia] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openSeason, setOpenSeason] = useState(null);

    useEffect(() => {
    async function loadMedia() {
        try {
            setLoading(true);

            const res = await api.get(`/media/${id}`);

            setMedia(res.data);
        } catch (err) {
            setError(err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    }

    loadMedia();
}, [id]);

    function toggleSeason(seasonNumber) {
        setOpenSeason(prev => (prev === seasonNumber ? null : seasonNumber));
    }

    if (loading)
        return (
            <div className="media-detail-loading">
                <p>Loading media...</p>
            </div>
        );

    if (error || !media)
        return (
            <div className="media-detail-error">
                <p>{error || "Media not found."}</p>
                <button onClick={() => navigate("/media")}>Go Back</button>
            </div>
        );

    const genres = media.genres ?? [];
    const seasons = media.seasons ?? [];

    return (
        <div className="media-detail-page">
            <button
                className="media-detail-back"
                onClick={() => navigate("/media")}
            >
                ← Back
            </button>

            <div className="media-detail-hero">
                <div className="media-detail-cover">
                    <img
                        src={
                            media.coverUrl ||
                            "https://placehold.co/300x450?text=No+Image"
                        }
                        alt={media.title}
                    />
                </div>

                <div className="media-detail-info">
                    <span className="media-detail-type-badge">
                        {media.type}
                    </span>

                    <h1 className="media-detail-title">{media.title}</h1>

                    <div className="media-detail-meta">
                        {media.releaseYear && <span>{media.releaseYear}</span>}
                        {media.duration && (
                            <span>{media.duration} min</span>
                        )}
                    </div>

                    <div className="media-detail-rating">
                        <span className="rating-star">★</span>
                        <span className="rating-value">
                            {media.averageRating?.toFixed(1) ?? "N/A"}
                        </span>
                        <span className="rating-count">
                            ({media.reviewCount ?? 0} reviews)
                        </span>
                    </div>

                    {genres.length > 0 && (
                        <div className="media-detail-genres">
                            {genres.map((g, i) => (
                                <span key={i} className="genre-tag">
                                    {g.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {media.description && (
                        <p className="media-detail-description">
                            {media.description}
                        </p>
                    )}
                    {media.type === "TvSeries" && (
                    <button
                        className="manage-seasons-btn"
                        onClick={() => navigate(`/media/${media.id}/seasons`)}
                    >
                        ⚙ Manage Seasons
                    </button>
)}
                </div>
            </div>

            {seasons.length > 0 && (
                <div className="media-seasons">
                    <h2 className="seasons-heading">Seasons</h2>

                    {seasons.map(season => (
                        <div
                            key={season.seasonNumber}
                            className="season-block"
                        >
                            <button
                                className="season-toggle"
                                onClick={() =>
                                    toggleSeason(season.seasonNumber)
                                }
                            >
                                Season {season.seasonNumber}

                                <span className="season-episode-count">
                                    {season.episodes?.length ?? 0} episodes
                                </span>

                                <span className="season-chevron">
                                    {openSeason === season.seasonNumber
                                        ? "▲"
                                        : "▼"}
                                </span>
                            </button>

                            {openSeason === season.seasonNumber && (
                                <div className="episodes-list">
                                    {season.episodes?.map(ep => (
                                        <div
                                            key={ep.episodeNumber}
                                            className="episode-row"
                                        >
                                            <span className="ep-number">
                                                E{ep.episodeNumber}
                                            </span>

                                            <span className="ep-title">
                                                {ep.title}
                                            </span>

                                            {ep.duration && (
                                                <span className="ep-duration">
                                                    {ep.duration} min
                                                </span>
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
}
