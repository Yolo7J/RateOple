import { Link } from 'react-router-dom';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';

const styles = {
  pageStack: 'gap-6',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  subtitle: 'text-sm text-[var(--text-muted)]',
  grid: 'gap-4 sm:grid-cols-2',
  card: [
    'group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]',
    'p-5 transition hover:border-[var(--accent)]/50 hover:bg-[var(--card-hover)]',
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
          <div>
            <h1 className={styles.title}>Admin Dashboard</h1>
            <p className={styles.subtitle}>Manage platform content and operations.</p>
          </div>

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
