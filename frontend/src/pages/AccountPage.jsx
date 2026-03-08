import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccountQuery } from '../features/users/queries/useAccountQuery';
import AccountSection from '../components/account/AccountSection';
import '../components/account/account.css';
import './pages.css';

function AccountPage() {
    const navigate = useNavigate();

    const { data, loading, error } = useAccountQuery();
    const ratings = data?.ratings ?? [];
    const reviews = data?.reviews ?? [];
    const statuses = data?.statuses ?? [];
    const errorMessage = error?.response?.data?.message || 'Failed to load account data.';

    const topGenres = useMemo(() => (Array.isArray(data?.genres) ? data.genres.slice(0, 12) : []), [data]);

    return (
        <main className="ro-page ro-account-page">
            <div className="ro-account-head">
                <h1>Account</h1>
                <button className="ro-back" onClick={() => navigate('/account/watchlist')}>Open watchlist</button>
            </div>

            {loading && <p>Loading account...</p>}
            {error && <p className="ro-error">{errorMessage}</p>}

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
