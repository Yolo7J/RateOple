import { Link } from 'react-router-dom';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';
import PageHeader from '../../../shared/ui/PageHeader';

const styles = {
  pageStack: 'gap-6',
  grid: 'gap-4 sm:grid-cols-2',
  card: [
    'ui-card-interactive group flex flex-col gap-3 p-5',
  ].join(' '),
  cardTitle: 'text-lg font-semibold text-[var(--text-primary)]',
  cardBody: 'text-sm text-[var(--text-muted)]',
  cardCta: 'text-sm font-semibold text-[var(--accent)]',
};

const ADMIN_LINKS = [
  {
    title: 'Media Management',
    description: 'Create, edit, and curate the media catalog.',
    to: '/admin/media',
  },
  {
    title: 'Moderation',
    description: 'Review reports and manage moderator assignments.',
    to: '/admin/moderation',
  },
];

const AdminDashboardPage = () => {
  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <PageHeader title="Admin Dashboard" subtitle="Manage platform content and operations." />

          <Grid cols={styles.grid}>
            {ADMIN_LINKS.map((item) => (
              <Link key={item.to} to={item.to} className={styles.card}>
                <div>
                  <h2 className={styles.cardTitle}>{item.title}</h2>
                  <p className={styles.cardBody}>{item.description}</p>
                </div>
                <span className={styles.cardCta}>Open section →</span>
              </Link>
            ))}
          </Grid>
        </Stack>
      </Container>
    </PageLayout>
  );
};

export default AdminDashboardPage;
