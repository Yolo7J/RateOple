import { Outlet } from 'react-router-dom';
import Header from '../shared/components/Header/Header';
import Footer from '../shared/components/Footer/Footer';

const GroupLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

export default GroupLayout;
