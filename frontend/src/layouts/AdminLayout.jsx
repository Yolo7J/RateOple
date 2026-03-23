import { NavLink, Outlet } from 'react-router-dom';
import SidebarLayout from './SidebarLayout';

const navLinkClass = ({ isActive }) =>
  [
    'rounded-md border border-[var(--border)] px-3 py-2 transition',
    isActive ? 'bg-[var(--card-bg)] text-[var(--text-primary)]' : 'hover:bg-[var(--card-hover)]',
  ].join(' ');

const AdminLayout = () => {
  return (
    <SidebarLayout
      sidebar={(
        <>
          <h3 className="text-lg font-semibold">Admin</h3>
          <nav className="grid gap-2 text-sm text-[var(--text-secondary)]">
            <NavLink to="/admin" end className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/media/add?from=admin" className={navLinkClass}>
              Add Media
            </NavLink>
            <NavLink to="/admin/media" className={navLinkClass}>
              Media Management
            </NavLink>
            <NavLink to="/admin/moderation" className={navLinkClass}>
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
