import { Route, Routes, Link } from 'react-router';
import { TruthTablePractice } from '../features/truthTable/TruthTablePractice';
import { AccountPanel } from '../features/auth/AccountPanel';
import { useAccountContext } from '../features/auth/AccountProvider';
import { Classrooms } from '../features/classroom/Classrooms';
import { InstructorRoute } from './InstructorRoute';
export function AppRoutes() {
  const account = useAccountContext();
  return <Routes>
    <Route path="/" element={<TruthTablePractice />} />
    <Route path="/account" element={<AccountPanel account={account} />} />
    <Route element={<InstructorRoute />}>
      <Route path="/classes" element={<Classrooms key={account.user?.id} />} />
    </Route>
    <Route path="*" element={<main><h1>Page not found</h1><Link to="/">Return to practice</Link></main>} />
  </Routes>;
}
