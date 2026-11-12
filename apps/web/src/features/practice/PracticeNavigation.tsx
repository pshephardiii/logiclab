import { NavLink } from 'react-router';
import { proofPracticePath, routeDefinitions } from '../../routing/route-definitions';
import './practice-navigation.css';

/** Keep both independent-practice modes discoverable without changing their session ownership. */
export function PracticeNavigation() {
  return (
    <nav className="practice-navigation" aria-label="Practice type">
      <NavLink to={routeDefinitions.practice.path} end>
        <strong>Truth tables</strong>
        <span>Construct and check a truth table</span>
      </NavLink>
      <NavLink to={proofPracticePath}>
        <strong>Derivations</strong>
        <span>Fitch, dependency and natural-deduction trees</span>
      </NavLink>
    </nav>
  );
}
