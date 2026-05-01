import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { buildAuthEntryUrl } from '../services/googleAuthService';

const RequireAuth = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) {
    const returnUrl = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={buildAuthEntryUrl('/login', returnUrl)} replace state={{ from: returnUrl }} />;
  }

  return <Outlet />;
};

export default RequireAuth;
