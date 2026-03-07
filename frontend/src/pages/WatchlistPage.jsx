import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import statusService from '../services/statusService';
import './pages.css';

const ORDER = ['Plan', 'On it', 'Done', 'Dropped'];

function WatchlistPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await statusService.getMyStatuses();
                if (!mounted) return;
                setItems(Array.isArray(data) ? data : []);
            } catch (e) {
                if (!mounted) return;
                setError(e.response?.data?.message || 'Failed to load watchlist.');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, []);

    const groups = useMemo(() => {
        return ORDER.reduce((acc, key) => {
            acc[key] = items.filter((x) => (x.status || '').toLowerCase() === key.toLowerCase());
            return acc;
        }, {});
    }, [items]);

    return (
        <main className="ro-page ro-watchlist-page">
            <h1>Watchlist</h1>
            {loading && <p>Loading watchlist...</p>}
            {error && <p className="ro-error">{error}</p>}

            {!loading && !error && ORDER.map((status) => (
                <section key={status} className="ro-watch-status-group">
                    <h2>{status}</h2>
                    {!groups[status]?.length && <p className="ro-muted">No media.</p>}
                    <div className="ro-watch-grid">
                        {groups[status]?.map((item) => (
                            <button
                                key={`${status}-${item.mediaId ?? item.id}`}
                                className="ro-watch-item"
                                onClick={() => navigate(`/media/${item.mediaId ?? item.id}`)}
                            >
                                <img src={item.coverUrl || 'https://placehold.co/80x120?text=No+Image'} alt={item.title} />
                                <span>{item.title}</span>
                            </button>
                        ))}
                    </div>
                </section>
            ))}
        </main>
    );
}

export default WatchlistPage;
