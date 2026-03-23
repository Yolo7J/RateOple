import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';

const styles = {
  pageStack: 'gap-4',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  body: 'text-sm text-[var(--text-muted)]',
  card: [
    'rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-bg)]',
    'p-6 text-center',
  ].join(' '),
};

const AdminMediaPage = () => {
  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <h1 className={styles.title}>Media Management</h1>
          <div className={styles.card}>
            <p className={styles.body}>Media management tools are loading.</p>
          </div>
        </Stack>
      </Container>
    </PageLayout>
  );
};

export default AdminMediaPage;
