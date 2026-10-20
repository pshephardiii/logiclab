import { Navigate, Outlet } from 'react-router';
import { Page } from '../components/layout/Page';
import { useAccountContext } from '../features/auth/AccountProvider';
import { routeDefinitions, type RouteAccess } from './route-definitions';

/**
 * Waits for account restoration, redirects signed-out visitors, and checks allowed roles.
 * Authorized child pages render through the routing outlet.
 */
export function ProtectedRoute({ allowedRoles, deniedTitle, deniedMessage }: RouteAccess) {
  const { user, busy, demoMode } = useAccountContext();

  if (busy) {
    return (
      <Page>
        <p role="status">Checking your account…</p>
      </Page>
    );
  }
  if (!user) {
    return <Navigate to={demoMode ? '/demo' : routeDefinitions.account.path} replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    return (
      <Page>
        <h1>{deniedTitle}</h1>
        <p>{deniedMessage}</p>
      </Page>
    );
  }
  return <Outlet />;
}
