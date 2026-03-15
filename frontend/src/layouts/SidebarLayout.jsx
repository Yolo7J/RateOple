import clsx from 'clsx';
import PageLayout from './PageLayout';
import Container from '../shared/ui/Container';
import Grid from '../shared/ui/Grid';

const SidebarLayout = ({
  sidebar,
  children,
  className,
  sidebarClassName,
  contentClassName,
}) => {
  return (
    <PageLayout>
      <Container>
        <Grid variant="sidebar" className={clsx('gap-6', className)}>
          <aside className={clsx('space-y-3', sidebarClassName)}>{sidebar}</aside>
          <div className={clsx('min-w-0', contentClassName)}>{children}</div>
        </Grid>
      </Container>
    </PageLayout>
  );
};

export default SidebarLayout;
