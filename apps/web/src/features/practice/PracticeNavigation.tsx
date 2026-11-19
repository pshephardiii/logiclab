import { NavLink } from 'react-router';
import {
  proofPracticePath,
  truthTreePracticePath,
  routeDefinitions,
} from '../../routing/route-definitions';
import './practice-navigation.css';

/** Keep independent-practice modes discoverable without changing their session ownership. */
export function PracticeNavigation() {
  return (
    <nav className="practice-navigation" aria-label="Practice type">
      <NavLink to={routeDefinitions.practice.path} end>
        <strong>Truth tables</strong>
        <span>Construct and check a truth table</span>
      </NavLink>
      <NavLink to={proofPracticePath}>
        <strong>Derivations</strong>
        <span>Fitch and dependency proofs</span>
      </NavLink>
      <NavLink to={truthTreePracticePath}>
        <strong>Truth trees</strong>
        <span>Semantic tableaux for arguments</span>
      </NavLink>
    </nav>
  );
}
