import { NavLink } from 'react-router';
import { useAccountContext } from '../features/auth/AccountProvider';
export function Navigation() {
  const { user } = useAccountContext();
  return <nav className="app-nav" aria-label="Main navigation">
    <NavLink to="/" end>Practice</NavLink>
    <NavLink to="/account">{user ? `Account · ${user.role}` : 'Sign in / Create account'}</NavLink>
    {user?.role === 'instructor' && <NavLink to="/classes">Classes</NavLink>}
  </nav>;
}
