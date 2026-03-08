import { NavLink, Outlet } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <div className="ro-page" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1rem' }}>
      <aside>
        <h3>Admin</h3>
        <nav style={{ display: 'grid', gap: '0.5rem' }}>
          <NavLink to="/admin">Moderation</NavLink>
        </nav>
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
