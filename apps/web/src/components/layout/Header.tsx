import { DemoBanner } from '../../features/demo/DemoBanner';
import { Navigation } from './Navigation';

export function Header() {
  return (
    <header className="app-header">
      <Navigation />
      <DemoBanner />
    </header>
  );
}
