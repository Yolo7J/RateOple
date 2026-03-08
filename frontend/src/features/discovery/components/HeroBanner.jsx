import { useNavigate } from 'react-router-dom';
import './discovery.css';

function HeroBanner({ item }) {
    const navigate = useNavigate();

    if (!item) return null;

    return (
        <section className="ro-hero-banner" onClick={() => navigate(`/media/${item.id}`)}>
            <img src={item.coverUrl || 'https://placehold.co/1200x500?text=No+Image'} alt={item.title} />
            <div className="overlay">
                <span className="pill">Trending</span>
                <h1>{item.title}</h1>
                <p>{item.releaseYear ?? 'Unknown year'} · {item.averageRating?.toFixed?.(1) ?? 'N/A'}</p>
            </div>
        </section>
    );
}

export default HeroBanner;
