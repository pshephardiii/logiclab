import { Navigate, Outlet } from 'react-router';
import { useAccountContext } from '../features/auth/AccountProvider';
import { routeDefinitions, type RouteAccess } from './route-definitions';

export function ProtectedRoute({ allowedRoles, deniedTitle, deniedMessage }: RouteAccess) {
  const { user, busy } = useAccountContext();

  if (busy) {
    return <main><p role="status">Checking your account…</p></main>;
  }
  if (!user) {
    return <Navigate to={routeDefinitions.account.path} replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    return <main><h1>{deniedTitle}</h1><p>{deniedMessage}</p></main>;
  }
  return <Outlet />;
}
