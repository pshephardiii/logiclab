import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { Page } from '../components/layout/Page';
import { PracticePage } from '../pages/practice/PracticePage';
import { NotFoundPage } from '../pages/not-found/NotFoundPage';
import { routeDefinitions, proofPracticePath, truthTreePracticePath } from './route-definitions';

const ProofPracticePage = lazy(() =>
  import('../pages/proof-practice/ProofPracticePage').then((module) => ({
    default: module.ProofPracticePage,
  })),
);
const TruthTreePracticePage = lazy(() =>
  import('../pages/truth-tree-practice/TruthTreePracticePage').then((module) => ({
    default: module.TruthTreePracticePage,
  })),
);

export const practicePageRoutes = [
  { path: routeDefinitions.practice.path, element: <PracticePage /> },
  { path: proofPracticePath, element: <ProofPracticePage /> },
  { path: truthTreePracticePath, element: <TruthTreePracticePage /> },
];

/** Only the three anonymous practice pages are available in the restricted application. */
export function PracticeRoutes() {
  return (
    <Suspense
      fallback={
        <Page>
          <p role="status">Loading page…</p>
        </Page>
      }
    >
      <Routes>
        {practicePageRoutes.map((route) => (
          <Route key={route.path} {...route} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
