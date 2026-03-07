import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userService from '../services/userService';
import AccountSection from '../components/account/AccountSection';
import '../components/account/account.css';
import './pages.css';

function AccountPage() {
    const navigate = useNavigate();

    const [ratings, setRatings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [genres, setGenres] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError('');

            try {
                const [r1, r2, r3] = await Promise.all([
                    userService.getMyRatings(),
                    userService.getMyReviews(),
                    userService.getMyStatuses(),
                ]);

                if (!mounted) return;

                setRatings(Array.isArray(r1) ? r1 : []);
                setReviews(Array.isArray(r2) ? r2 : []);
                setStatuses(Array.isArray(r3) ? r3 : []);

                try {
                    const g = await userService.getMyFavoriteGenres();
                    if (mounted) setGenres(Array.isArray(g) ? g : []);
                } catch {
                    if (mounted) setGenres([]);
                }
            } catch (e) {
                if (!mounted) return;
                setError(e.response?.data?.message || 'Failed to load account data.');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, []);

    const topGenres = useMemo(() => genres.slice(0, 12), [genres]);

    return (
        <main className="ro-page ro-account-page">
            <div className="ro-account-head">
                <h1>Account</h1>
                <button className="ro-back" onClick={() => navigate('/account/watchlist')}>Open watchlist</button>
            </div>

            {loading && <p>Loading account...</p>}
            {error && <p className="ro-error">{error}</p>}

            {!loading && !error && (
                <div className="ro-account-grid">
                    <AccountSection title="User ratings">
                        <ul className="ro-account-list">
                            {ratings.slice(0, 20).map((item) => (
                                <li key={item.id}>{item.value}/10 · {item.mediaTitle || item.mediaId || item.seasonId || item.episodeId}</li>
                            ))}
                            {!ratings.length && <li>No ratings yet.</li>}
                        </ul>
                    </AccountSection>

                    <AccountSection title="User reviews">
                        <ul className="ro-account-list">
                            {reviews.slice(0, 20).map((item) => (
                                <li key={item.id}>{item.content}</li>
                            ))}
                            {!reviews.length && <li>No reviews yet.</li>}
                        </ul>
                    </AccountSection>

                    <AccountSection title="Watchlist">
                        <ul className="ro-account-list">
                            {statuses.slice(0, 20).map((item, idx) => (
                                <li key={`${item.mediaId ?? item.id}-${idx}`}>{item.title || item.mediaTitle || item.mediaId} · {item.status}</li>
                            ))}
                            {!statuses.length && <li>No watchlist items.</li>}
                        </ul>
                    </AccountSection>

                    <AccountSection title="Favorite genres">
                        <div className="ro-chip-list">
                            {topGenres.map((genre, idx) => (
                                <span key={`${genre.name ?? genre}-${idx}`} className="ro-chip">{genre.name ?? genre}</span>
                            ))}
                            {!topGenres.length && <span className="ro-muted">No favorite genres yet.</span>}
                        </div>
                    </AccountSection>
                </div>
            )}
        </main>
    );
}

export default AccountPage;
