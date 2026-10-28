import { Navigation } from './Navigation';
import { WorkspaceNavigation } from './WorkspaceNavigation';

export function Header() {
  return (
    <header className="app-header">
      <Navigation />
      <WorkspaceNavigation />
    </header>
  );
}
