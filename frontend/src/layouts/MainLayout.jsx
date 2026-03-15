import { Outlet } from 'react-router-dom';
import Header from '../shared/components/Header/Header';
import Footer from '../shared/components/Footer/Footer';

const MainLayout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

export default MainLayout;
