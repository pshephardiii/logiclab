import { ProblemLibraryPage } from '../pages/problem-library/ProblemLibraryPage';
import { Route, Routes } from 'react-router';
import { PracticePage } from '../pages/practice/PracticePage';
import { AccountPage } from '../pages/account/AccountPage';
import { InstructorClassesPage } from '../pages/instructor-classes/InstructorClassesPage';
import { StudentClassesPage } from '../pages/student-classes/StudentClassesPage';
import { NotFoundPage } from '../pages/not-found/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';
import { routeDefinitions } from './route-definitions';

/**
 * Connects route metadata to page components and their role guards.
 */
export function AppRoutes() {
  const { practice, account, instructorClasses, studentClasses, problemLibrary } = routeDefinitions;

  return (
    <Routes>
      <Route path={practice.path} element={<PracticePage />} />
      <Route path={account.path} element={<AccountPage />} />
      <Route element={<ProtectedRoute {...instructorClasses.access} />}>
        <Route path={instructorClasses.path} element={<InstructorClassesPage />} />
      </Route>
      <Route element={<ProtectedRoute {...studentClasses.access} />}>
        <Route path={studentClasses.path} element={<StudentClassesPage />} />
      </Route>
      <Route element={<ProtectedRoute {...problemLibrary.access} />}>
        <Route path={problemLibrary.path} element={<ProblemLibraryPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
