import MediaRow from './MediaRow';
import './discovery.css';

function DiscoverySection({ title, items, loading, error }) {
    return (
        <section className="ro-discovery-section">
            <h2>{title}</h2>
            {loading && <p>Loading...</p>}
            {error && <p className="ro-error">{error}</p>}
            {!loading && !error && <MediaRow items={items} />}
        </section>
    );
}

export default DiscoverySection;
