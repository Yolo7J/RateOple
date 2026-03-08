import { Outlet } from 'react-router-dom';

const GroupLayout = () => {
  return (
    <>
      <div className="ro-page"><h1>Groups</h1></div>
      <Outlet />
    </>
  );
};

export default GroupLayout;
