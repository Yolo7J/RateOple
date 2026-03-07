import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import discoveryService from '../services/discoveryService';
import HeroBanner from '../components/discovery/HeroBanner';
import DiscoverySection from '../components/discovery/DiscoverySection';
import '../components/discovery/discovery.css';
import './pages.css';

function HomePage() {
    const { user } = useAuth();
    const [trending, setTrending] = useState([]);
    const [popular, setPopular] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError('');

            try {
                const [trendingData, popularData] = await Promise.all([
                    discoveryService.getTrending(24),
                    discoveryService.getPopular(60),
                ]);

                if (!mounted) return;
                setTrending(Array.isArray(trendingData) ? trendingData : []);
                setPopular(Array.isArray(popularData) ? popularData : []);

                if (user) {
                    try {
                        const rec = await discoveryService.getRecommended(24);
                        if (mounted) setRecommended(Array.isArray(rec) ? rec : []);
                    } catch {
                        if (mounted) setRecommended([]);
                    }
                } else {
                    setRecommended([]);
                }
            } catch (e) {
                if (!mounted) return;
                setError(e.response?.data?.message || 'Failed to load discovery content.');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, [user]);

    const popularMovies = useMemo(() => popular.filter((x) => x.type === 'Movie').slice(0, 20), [popular]);
    const popularTv = useMemo(() => popular.filter((x) => x.type === 'TvSeries').slice(0, 20), [popular]);
    const popularBooks = useMemo(() => popular.filter((x) => x.type === 'Book').slice(0, 20), [popular]);

    return (
        <main className="ro-page ro-home-page">
            <HeroBanner item={trending[0]} />

            <DiscoverySection
                title="Trending Now"
                items={trending}
                loading={loading}
                error={error}
            />

            {user && (
                <DiscoverySection
                    title="Recommended For You"
                    items={recommended}
                    loading={loading}
                    error=""
                />
            )}

            <DiscoverySection
                title="Popular Movies"
                items={popularMovies}
                loading={loading}
                error=""
            />

            <DiscoverySection
                title="Popular TV Series"
                items={popularTv}
                loading={loading}
                error=""
            />

            <DiscoverySection
                title="Popular Books"
                items={popularBooks}
                loading={loading}
                error=""
            />
        </main>
    );
}

export default HomePage;
