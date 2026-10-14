import { Link } from 'react-router';
import { Page } from '../../components/layout/Page';
import { routeDefinitions } from '../../routing/route-definitions';

export function NotFoundPage() {
  return (
    <Page>
      <h1>Page not found</h1>
      <Link to={routeDefinitions.practice.path}>Return to practice</Link>
    </Page>
  );
}
