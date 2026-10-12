import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Spinner } from './Feedback.jsx';

export function ProtectedRoute({ permission }) {
  const location = useLocation();
  const { user, permissions, initializing } = useSelector((state) => state.auth);

  if (initializing) return <Spinner label="正在校验登录状态…" />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (permission && !permissions.includes(permission)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}

export function GuestOnlyRoute() {
  const { user, initializing } = useSelector((state) => state.auth);
  if (initializing) return <Spinner label="正在校验登录状态…" />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
