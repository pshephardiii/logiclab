import { Navigate, Outlet } from 'react-router';
import { Page } from '../components/layout/Page';
import { useAccountContext } from '../features/auth/AccountProvider';
import { routeDefinitions, type RouteAccess } from './route-definitions';

export function ProtectedRoute({ allowedRoles, deniedTitle, deniedMessage }: RouteAccess) {
  const { user, busy } = useAccountContext();

  if (busy) {
    return <Page><p role="status">Checking your account…</p></Page>;
  }
  if (!user) {
    return <Navigate to={routeDefinitions.account.path} replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    return <Page><h1>{deniedTitle}</h1><p>{deniedMessage}</p></Page>;
  }
  return <Outlet />;
}
