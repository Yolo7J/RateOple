import { NavLink, Outlet } from 'react-router-dom';
import SidebarLayout from './SidebarLayout';

const AdminLayout = () => {
  return (
    <SidebarLayout
      sidebar={(
        <>
          <h3 className="text-lg font-semibold">Admin</h3>
          <nav className="grid gap-2 text-sm text-[var(--text-secondary)]">
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                [
                  'rounded-md border border-[var(--border)] px-3 py-2 transition',
                  isActive
                    ? 'bg-[var(--card-bg)] text-[var(--text-primary)]'
                    : 'hover:bg-[var(--card-hover)]',
                ].join(' ')
              }
            >
              Moderation
            </NavLink>
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
