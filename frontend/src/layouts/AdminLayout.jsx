import { NavLink, Outlet } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from './SidebarLayout';

const navLinkClass = ({ isActive }) =>
  [
    'rounded-md border border-[var(--border)] px-3 py-2 transition',
    isActive ? 'bg-[var(--card-bg)] text-[var(--text-primary)]' : 'hover:bg-[var(--card-hover)]',
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
          <h3 className="text-lg font-semibold">{title}</h3>
          <nav className="grid gap-2 text-sm text-[var(--text-secondary)]">
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
