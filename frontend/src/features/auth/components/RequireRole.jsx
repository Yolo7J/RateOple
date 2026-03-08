import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

const normalizeRole = (role) => String(role || '').toLowerCase();

const RequireRole = ({ allow = [] }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const allowed = allow.map(normalizeRole);
  const userRoles = Array.isArray(user.roles) ? user.roles.map(normalizeRole) : [];
  const hasRequiredRole = allowed.some((role) => userRoles.includes(role));

  if (!hasRequiredRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RequireRole;
