import { Link } from 'react-router-dom';
import { Clapperboard, ShieldCheck } from 'lucide-react';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import '../admin.css';

const ADMIN_LINKS = [
  {
    title: 'Media management',
    description: 'Create, edit, and curate movies, TV series, and books.',
    to: '/admin/media',
    icon: Clapperboard,
  },
  {
    title: 'Moderation',
    description: 'Review reports and manage moderator assignments.',
    to: '/admin/moderation',
    icon: ShieldCheck,
  },
];

const AdminDashboardPage = () => {
  return (
    <PageLayout>
      <Container size="xxl">
        <div className="admin-workspace">
          <header className="admin-hero">
            <p className="admin-eyebrow">Staff workspace</p>
            <h1 className="admin-hero__title">Admin dashboard</h1>
            <p className="admin-hero__copy">
              Jump into catalog and moderation workflows from a focused operational start point.
            </p>
          </header>

          <div className="admin-grid">
            {ADMIN_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className="admin-card">
                  <Icon className="h-6 w-6 text-[var(--accent)]" aria-hidden="true" />
                  <div>
                    <h2 className="admin-card__title">{item.title}</h2>
                    <p className="admin-card__body">{item.description}</p>
                  </div>
                  <span className="admin-card__cta">Open section</span>
                </Link>
              );
            })}
          </div>
        </div>
      </Container>
    </PageLayout>
  );
};

export default AdminDashboardPage;
