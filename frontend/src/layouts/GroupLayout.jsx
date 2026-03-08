import { Outlet } from 'react-router-dom';
import Header from '../shared/components/Header/Header';
import Footer from '../shared/components/Footer/Footer';

const GroupLayout = () => {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
};

export default GroupLayout;
