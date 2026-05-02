import { NavLink, Outlet } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from './SidebarLayout';

const navLinkClass = ({ isActive }) =>
  [
    'rounded-[var(--radius-md)] border px-3 py-2 text-sm font-semibold transition',
    isActive
      ? 'border-[var(--accent)] bg-[var(--primary-color-alpha)] text-[var(--text-primary)]'
      : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]',
  ].join(' ');

const AdminLayout = () => {
  const { user } = useAuth();
  const roles = useMemo(() => (Array.isArray(user?.roles) ? user.roles : []), [user]);
  const isAdmin = roles.some((role) => ['Admin', 'SuperAdmin'].includes(role));
  const canModerate = roles.some((role) => ['Admin', 'SuperAdmin', 'Moderator'].includes(role));

  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        { to: '/admin', label: 'Dashboard' },
        { to: '/media/add?from=admin', label: 'Add Media' },
        { to: '/admin/media', label: 'Media Management' },
        { to: '/admin/moderation', label: 'Moderation' },
        { to: '/admin/moderation/audit-logs', label: 'Audit Logs' },
      ];
    }

    if (canModerate) {
      return [
        { to: '/admin/moderation', label: 'Moderation' },
        { to: '/admin/moderation/audit-logs', label: 'Audit Logs' },
      ];
    }

    return [];
  }, [isAdmin, canModerate]);

  const title = isAdmin ? 'Admin' : 'Moderation';

  return (
    <SidebarLayout
      sidebar={(
        <>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Workspace</p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          </div>
          <nav className="grid gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/admin'} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}
      contentClassName="min-h-[200px]"
    >
      <Outlet />
    </SidebarLayout>
  );
};

export default AdminLayout;
