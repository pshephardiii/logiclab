import { Route, Routes, Link } from 'react-router';
import { TruthTablePractice } from '../features/truthTable/TruthTablePractice';
import { AccountPanel } from '../features/auth/AccountPanel';
import { useAccountContext } from '../features/auth/AccountProvider';
import { Classrooms } from '../features/classroom/Classrooms';
import { StudentClasses } from '../features/classroom/StudentClasses';
import { ProtectedRoute } from './ProtectedRoute';
import { routeDefinitions } from './route-definitions';

export function AppRoutes() {
  const account = useAccountContext();
  const { practice, instructorClasses, studentClasses } = routeDefinitions;

  return (
    <Routes>
      <Route path={practice.path} element={<TruthTablePractice />} />
      <Route path={routeDefinitions.account.path} element={<AccountPanel account={account} />} />
      <Route element={<ProtectedRoute {...instructorClasses.access} />}>
        <Route path={instructorClasses.path} element={<Classrooms key={account.user?.id} />} />
      </Route>
      <Route element={<ProtectedRoute {...studentClasses.access} />}>
        <Route path={studentClasses.path} element={<StudentClasses key={account.user?.id} />} />
      </Route>
      <Route path="*" element={
        <main><h1>Page not found</h1><Link to={practice.path}>Return to practice</Link></main>
      } />
    </Routes>
  );
}
