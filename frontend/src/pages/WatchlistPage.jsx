import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUS_TYPES } from '../shared/constants/statusTypes';
import { useWatchlistQuery } from '../features/users/queries/useWatchlistQuery';
import './pages.css';

const ORDER = STATUS_TYPES;

function WatchlistPage() {
    const navigate = useNavigate();
    const { data, loading, error } = useWatchlistQuery();
    const errorMessage = error?.response?.data?.message || 'Failed to load watchlist.';

    const groups = useMemo(() => {
        const items = Array.isArray(data) ? data : [];
        return ORDER.reduce((acc, key) => {
            acc[key] = items.filter((x) => (x.status || '').toLowerCase() === key.toLowerCase());
            return acc;
        }, {});
    }, [data]);

    return (
        <main className="ro-page ro-watchlist-page">
            <h1>Watchlist</h1>
            {loading && <p>Loading watchlist...</p>}
            {error && <p className="ro-error">{errorMessage}</p>}

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
