import { Page } from '../../components/layout/Page';
import { TruthTablePractice } from '../../features/truthTable/TruthTablePractice';
import { Link } from 'react-router';
import { proofPracticePath } from '../../routing/route-definitions';

export function PracticePage() {
  return (
    <Page>
      <p>
        <Link to={proofPracticePath}>Try derivation practice</Link>
      </p>
      <TruthTablePractice />
    </Page>
  );
}
