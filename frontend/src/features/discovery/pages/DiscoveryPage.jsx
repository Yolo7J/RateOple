import { useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useHomeDiscoveryQuery } from '../queries/useHomeDiscoveryQuery';
import HeroBanner from '../components/HeroBanner';
import DiscoverySection from '../components/DiscoverySection';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';

const styles = {
  stack: 'gap-6',
};

function DiscoveryPage() {
  const { user } = useAuth();
  const { data, loading, error } = useHomeDiscoveryQuery(user);
  const trending = Array.isArray(data?.trending) ? data.trending : [];
  const recommended = Array.isArray(data?.recommended) ? data.recommended : [];
  const popular = useMemo(
    () => (Array.isArray(data?.popular) ? data.popular : []),
    [data]
  );
  const errorMessage = error?.response?.data?.message || 'Failed to load discovery content.';

  const popularMovies = useMemo(
    () => popular.filter((x) => x.type === 'Movie').slice(0, 20),
    [popular]
  );
  const popularTv = useMemo(
    () => popular.filter((x) => x.type === 'TvSeries').slice(0, 20),
    [popular]
  );
  const popularBooks = useMemo(
    () => popular.filter((x) => x.type === 'Book').slice(0, 20),
    [popular]
  );

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.stack}>
          <HeroBanner item={trending[0]} />

          <DiscoverySection
            title="Trending Now"
            items={trending}
            loading={loading}
            error={error ? errorMessage : ''}
          />

          {user ? (
            <DiscoverySection
              title="Recommended For You"
              items={recommended}
              loading={loading}
              error=""
            />
          ) : null}

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
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default DiscoveryPage;
