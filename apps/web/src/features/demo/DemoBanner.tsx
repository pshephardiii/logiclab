import { Link } from 'react-router';
import { useAccountContext } from '../auth/AccountProvider';
import './demo-banner.css';
import type { ReactNode } from 'react';

export function DemoBanner({ children }: { children?: ReactNode }) {
  const { demoMode, demo } = useAccountContext();

  if (!demoMode || !demo?.session) return null;

  return (
    <aside className="demo-banner" aria-label="Demo notice">
      <div className="workspace-surface demo-banner-content">
        <p>
          <strong className="workspace-title">
            <span className="demo-banner-role">{demo.session.user.role}</span> workspace
            <span className="workspace-badge">Demo</span>
          </strong>
          <span>Synthetic data · No real charges.</span>
        </p>
        <Link to="/demo">Switch role, reset, or end demo</Link>
        {children}
      </div>
    </aside>
  );
}
