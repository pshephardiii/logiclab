import { Link } from 'react-router';
import { useAccountContext } from '../auth/AccountProvider';
import './demo-banner.css';
import type { ReactNode } from 'react';

export function DemoBanner({ children }: { children?: ReactNode }) {
  const { demoMode, demo } = useAccountContext();
  if (!demoMode || !demo?.session) return null;
  return (
    <aside className="demo-banner" aria-label="Demo notice">
      <div className="demo-banner-content">
        <p>
          <strong>Demo workspace</strong>
          <span>
            <span className="demo-banner-role">{demo.session.user.role}</span> view · Synthetic data
            · No real charges.
          </span>
        </p>
        <Link to="/demo">Switch role, reset, or end demo</Link>
        {children}
      </div>
    </aside>
  );
}
