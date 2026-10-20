import './navigation.css';
import { NavLink } from 'react-router';
import { useAccountContext } from '../../features/auth/AccountProvider';
import { navigationRoutes } from '../../routing/route-definitions';

/**
 * Renders route-defined links visible to the current account role.
 * Access enforcement remains in route guards and the backend.
 */
export function Navigation() {
  const { user, demoMode } = useAccountContext();
  const visibleRoutes = navigationRoutes.filter(
    (route) => !route.access || (user && route.access.allowedRoles.includes(user.role)),
  );

  return (
    <nav className="app-nav" aria-label="Main navigation">
      <NavLink to="/demo" end>
        Explore demo
      </NavLink>
      {visibleRoutes.map(({ path, navigation }) => (
        <NavLink
          key={path}
          to={demoMode && path !== '/' && path !== '/account' ? `/demo${path}` : path}
          end={navigation.end}
        >
          {demoMode && path === '/account'
            ? 'Use a normal account'
            : user && navigation.signedInLabel
              ? navigation.signedInLabel(user)
              : navigation.label}
        </NavLink>
      ))}
    </nav>
  );
}
