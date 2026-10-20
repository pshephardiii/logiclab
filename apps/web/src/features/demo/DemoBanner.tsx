import { Link } from 'react-router';
import { useAccountContext } from '../auth/AccountProvider';
export function DemoBanner() {
  const { demoMode, demo } = useAccountContext();
  if (!demoMode || !demo?.session) return null;
  return (
    <aside aria-label="Demo notice">
      <p>
        Synthetic demo · {demo.session.user.role} · No real charges.{' '}
        <Link to="/demo">Switch role, reset, or end demo</Link>
      </p>
    </aside>
  );
}
