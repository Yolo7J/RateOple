import { Outlet } from 'react-router-dom';
import Header from '../shared/components/Header/Header';
import Footer from '../shared/components/Footer/Footer';

const MainLayout = () => {
  return (
    <div className="app-shell flex min-h-screen flex-col text-[var(--text-primary)]">
      <Header />
      <main className="app-main min-w-0 flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
