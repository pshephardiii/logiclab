import { NavLink } from 'react-router';
import { useAccountContext } from '../../features/auth/AccountProvider';
import { DemoBanner } from '../../features/demo/DemoBanner';
import { navigationRoutes } from '../../routing/route-definitions';

/** Role-specific destinations stay bound to the active normal or demo workspace. */
export function WorkspaceNavigation() {
  const { user, demoMode } = useAccountContext();
  if (!user) return null;

  const workspaceRoutes = navigationRoutes.filter((route) =>
    route.access?.allowedRoles.includes(user.role),
  );
  const links = (
    <nav
      className="workspace-nav"
      aria-label={demoMode ? 'Demo workspace navigation' : 'Account workspace navigation'}
    >
      {workspaceRoutes.map(({ path, navigation }) => (
        <NavLink key={path} to={demoMode ? `/demo${path}` : path} end={navigation.end}>
          {navigation.label}
        </NavLink>
      ))}
    </nav>
  );

  if (demoMode) return <DemoBanner>{links}</DemoBanner>;

  return (
    <section className="account-workspace" aria-label="Account workspace">
      <div className="account-workspace-content">
        <p className="workspace-title">
          {user.role === 'instructor' ? 'Instructor' : 'Student'} workspace
        </p>
        {links}
      </div>
    </section>
  );
}
