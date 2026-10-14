import './navigation.css';
import { NavLink } from 'react-router';
import { useAccountContext } from '../../features/auth/AccountProvider';
import { navigationRoutes } from '../../routing/route-definitions';

/**
 * Renders route-defined links visible to the current account role.
 * Access enforcement remains in route guards and the backend.
 */
export function Navigation() {
  const { user } = useAccountContext();
  const visibleRoutes = navigationRoutes.filter(
    (route) => !route.access || (user && route.access.allowedRoles.includes(user.role)),
  );

  return (
    <nav className="app-nav" aria-label="Main navigation">
      {visibleRoutes.map(({ path, navigation }) => (
        <NavLink key={path} to={path} end={navigation.end}>
          {user && navigation.signedInLabel ? navigation.signedInLabel(user) : navigation.label}
        </NavLink>
      ))}
    </nav>
  );
}
