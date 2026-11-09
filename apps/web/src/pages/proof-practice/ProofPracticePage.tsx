import { Link } from 'react-router';
import { Page } from '../../components/layout/Page';
import { routeDefinitions } from '../../routing/route-definitions';
import { ProofPractice } from './components/ProofPractice';

export function ProofPracticePage() {
  return (
    <Page>
      <p>
        <Link to={routeDefinitions.practice.path}>Truth-table practice</Link>
      </p>
      <ProofPractice />
    </Page>
  );
}
