import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router';
import { expect, test, vi } from 'vitest';
import { useAccountContext } from '../features/auth/AccountProvider';
import { AppRoutes } from './AppRoutes';
import { UnsavedWorkProvider } from '../features/unsaved-work/UnsavedWorkProvider';
import { proofPracticePath } from './route-definitions';

vi.mock('../features/auth/AccountProvider', () => ({ useAccountContext: vi.fn() }));
vi.mock('../components/layout/Page', () => ({
  Page: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('../pages/account/AccountPage', () => ({ AccountPage: () => <h1>Account</h1> }));
vi.mock('../pages/student-work/StudentWorkPage', () => ({
  StudentWorkPage: () => <h1>Student work</h1>,
}));
vi.mock('../pages/instructor-assignments/InstructorAssignmentsPage', () => ({
  InstructorAssignmentsPage: () => <h1>Instructor assignments</h1>,
}));

function visit(path: string, role: 'student' | 'instructor' | null) {
  vi.mocked(useAccountContext).mockReturnValue({
    user: role ? { id: 'user', role } : null,
    busy: false,
    demoMode: path.startsWith('/demo/'),
  } as ReturnType<typeof useAccountContext>);
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

test('signed-out visitors redirect before loading a protected page', () => {
  visit('/assignments', null);
  expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
  expect(screen.queryByText('Loading page…')).not.toBeInTheDocument();
});

test('self-created proof practice is directly accessible without account or demo resource context', async () => {
  vi.mocked(useAccountContext).mockReturnValue({
    user: null,
    busy: false,
    demoMode: false,
  } as ReturnType<typeof useAccountContext>);
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <UnsavedWorkProvider>
            <AppRoutes />
          </UnsavedWorkProvider>
        ),
      },
    ],
    { initialEntries: [proofPracticePath] },
  );
  render(<RouterProvider router={router} />);

  expect(
    await screen.findByRole('heading', { name: 'Practice a derivation.' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('form', { name: 'Proof practice setup' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Account' })).not.toBeInTheDocument();
});

test('wrong roles retain the access guard around lazy pages', () => {
  visit('/work', 'instructor');
  expect(screen.getByRole('heading', { name: 'Student access required' })).toBeInTheDocument();
});

test('a newly requested page has an accessible loading fallback', async () => {
  visit('/work', 'student');
  expect(screen.getByRole('status')).toHaveTextContent('Loading page…');
  expect(await screen.findByRole('heading', { name: 'Student work' })).toBeInTheDocument();
});

test.each([
  ['/demo/work', 'student', 'Student work'],
  ['/assignments', 'instructor', 'Instructor assignments'],
  ['/demo/assignments', 'instructor', 'Instructor assignments'],
] as const)('loads %s for its authorized role', async (path, role, heading) => {
  visit(path, role);
  expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
});
