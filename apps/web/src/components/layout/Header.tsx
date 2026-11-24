import { Link } from 'react-router';
import { ProductExposure } from '@logiclab/contracts/product-exposure';
import { useProductExposure } from '../../features/product-exposure/ProductExposureContext';
import { Navigation } from './Navigation';
import { WorkspaceNavigation } from './WorkspaceNavigation';

export function Header() {
  const exposure = useProductExposure();

  return (
    <header className="app-header">
      {exposure === ProductExposure.PracticeOnly ? (
        <nav className="app-nav" aria-label="Main navigation">
          <Link to="/">Practice</Link>
        </nav>
      ) : (
        <>
          <Navigation />
          <WorkspaceNavigation />
        </>
      )}
    </header>
  );
}
