import { Outlet } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <div className="ro-page" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1rem' }}>
      <aside>
        <h3>Admin</h3>
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
