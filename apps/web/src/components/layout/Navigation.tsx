import './navigation.css';
import { NavLink } from 'react-router';
import { useAccountContext } from '../../features/auth/AccountProvider';
import { navigationRoutes } from '../../routing/route-definitions';

/**
 * Keeps site destinations separate from role-specific workspace navigation.
 */
export function Navigation() {
  const { user, demoMode } = useAccountContext();
  const siteRoutes = navigationRoutes.filter((route) => !route.access);

  return (
    <nav className="app-nav" aria-label="Main navigation">
      <NavLink to="/demo" end>
        Explore demo
      </NavLink>
      {siteRoutes.map(({ path, navigation }) => (
        <NavLink key={path} to={path} end={navigation.end}>
          {!demoMode && user && navigation.signedInLabel
            ? navigation.signedInLabel(user)
            : navigation.label}
        </NavLink>
      ))}
    </nav>
  );
}
