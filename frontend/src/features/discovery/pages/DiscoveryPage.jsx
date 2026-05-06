import { useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useHomeDiscoveryQuery } from '../queries/useHomeDiscoveryQuery';
import DiscoveryHero from '../components/DiscoveryHero';
import DiscoveryQuickLinks from '../components/DiscoveryQuickLinks';
import DiscoverySection from '../components/DiscoverySection';
import DiscoveryExploreTypes from '../components/DiscoveryExploreTypes';
import DiscoveryCommunityPanel from '../components/DiscoveryCommunityPanel';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';

const styles = {
  stack: 'discovery-page',
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
      <Container size="xxl">
        <Stack className={styles.stack}>
          <DiscoveryHero item={trending[0]} user={user} loading={loading} />
          <DiscoveryQuickLinks />

          <DiscoverySection
            title="Trending Now"
            description="Titles getting attention across the RateOple catalog right now."
            items={trending}
            loading={loading}
            error={error ? errorMessage : ''}
            emptyTitle="No trending media yet"
            emptyDescription="Trending media will appear here once the catalog has enough rating activity."
          />

          {user ? (
            <DiscoverySection
              title="Recommended For You"
              description="Personalized picks from the existing recommendation service."
              items={recommended}
              loading={loading}
              error=""
              emptyTitle="No recommendations yet"
              emptyDescription="Rate more media to help RateOple shape this row."
            />
          ) : null}

          <DiscoveryExploreTypes />

          <DiscoverySection
            title="Popular Movies"
            description="Film picks from the current popular discovery feed."
            actionTo="/media?types=Movie"
            items={popularMovies}
            loading={loading}
            error=""
            emptyTitle="No popular movies yet"
            emptyDescription="Movie results will appear here when they are available from discovery."
          />

          <DiscoverySection
            title="Popular TV Series"
            description="Series picks from the current popular discovery feed."
            actionTo="/media?types=TvSeries"
            items={popularTv}
            loading={loading}
            error=""
            emptyTitle="No popular TV series yet"
            emptyDescription="TV series results will appear here when they are available from discovery."
          />

          <DiscoverySection
            title="Popular Books"
            description="Books are first-class media in RateOple, not a side catalog."
            actionTo="/media?types=Book"
            items={popularBooks}
            loading={loading}
            error=""
            emptyTitle="No popular books yet"
            emptyDescription="Book results will appear here when they are available from discovery."
          />

          <DiscoveryCommunityPanel />
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default DiscoveryPage;
