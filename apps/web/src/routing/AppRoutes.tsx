import { DemoPage } from '../pages/demo/DemoPage';
import { InstructorBillingPage } from '../pages/instructor-billing/InstructorBillingPage';
import { StudentWorkPage } from '../pages/student-work/StudentWorkPage';
import { InstructorAssignmentsPage } from '../pages/instructor-assignments/InstructorAssignmentsPage';
import { ProblemLibraryPage } from '../pages/problem-library/ProblemLibraryPage';
import { Route, Routes } from 'react-router';
import { PracticePage } from '../pages/practice/PracticePage';
import { AccountPage } from '../pages/account/AccountPage';
import { InstructorClassesPage } from '../pages/instructor-classes/InstructorClassesPage';
import { StudentClassesPage } from '../pages/student-classes/StudentClassesPage';
import { NotFoundPage } from '../pages/not-found/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';
import { routeDefinitions } from './route-definitions';

const accountPages = [
  { definition: routeDefinitions.instructorClasses, element: <InstructorClassesPage /> },
  { definition: routeDefinitions.studentClasses, element: <StudentClassesPage /> },
  { definition: routeDefinitions.problemLibrary, element: <ProblemLibraryPage /> },
  { definition: routeDefinitions.instructorAssignments, element: <InstructorAssignmentsPage /> },
  { definition: routeDefinitions.studentWork, element: <StudentWorkPage /> },
  { definition: routeDefinitions.instructorBilling, element: <InstructorBillingPage /> },
];

/** Shared pages use the same role guards in normal and isolated demo route trees. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/demo" element={<DemoPage />} />
      <Route path={routeDefinitions.practice.path} element={<PracticePage />} />
      <Route path={routeDefinitions.account.path} element={<AccountPage />} />
      {['', '/demo'].flatMap((prefix) =>
        accountPages.map(({ definition, element }) => (
          <Route
            key={`${prefix}${definition.path}`}
            element={<ProtectedRoute {...definition.access} />}
          >
            <Route path={`${prefix}${definition.path}`} element={element} />
          </Route>
        )),
      )}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
