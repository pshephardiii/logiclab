import { useState } from 'react';
import { installDialogStub, renderWithUnsavedWork } from '../../test/unsaved-work';
import { useUnsavedWork } from '../features/unsaved-work/hooks/useUnsavedWork';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, test, vi } from 'vitest';
import { useAccountContext } from '../features/auth/AccountProvider';
import { ProtectedRoute } from './ProtectedRoute';
import { Navigation } from '../components/layout/Navigation';
import { routeDefinitions } from './route-definitions';

installDialogStub();

vi.mock('../features/auth/AccountProvider', () => ({ useAccountContext: vi.fn() }));
function account(role: 'student' | 'instructor' | null, busy = false) {
  vi.mocked(useAccountContext).mockReturnValue({
    user: role ? { id: 'user', role } : null,
    busy,
  } as ReturnType<typeof useAccountContext>);
}
function protectedPage() {
  render(
    <MemoryRouter initialEntries={['/classes']}>
      <Routes>
        <Route path="/account" element={<h1>Account page</h1>} />
        <Route element={<ProtectedRoute {...routeDefinitions.instructorClasses.access} />}>
          <Route path="/classes" element={<h1>Protected content</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

test('restoration waits before redirecting or revealing protected content', () => {
  account(null, true);
  protectedPage();
  expect(screen.getByRole('status')).toHaveTextContent('Checking your account');
  expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  expect(screen.queryByText('Account page')).not.toBeInTheDocument();
});

test('signed-out visitors redirect to the account page', () => {
  account(null);
  protectedPage();
  expect(screen.getByRole('heading', { name: 'Account page' })).toBeInTheDocument();
});

test('wrong roles are denied and allowed roles render the outlet', () => {
  account('student');
  protectedPage();
  expect(screen.getByRole('heading', { name: 'Instructor access required' })).toBeInTheDocument();
});

test('instructors reach protected content', () => {
  account('instructor');
  protectedPage();
  expect(screen.getByRole('heading', { name: 'Protected content' })).toBeInTheDocument();
});

test.each([null, 'student', 'instructor'] as const)(
  'navigation shows only links for role %s',
  (role) => {
    account(role);
    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Practice' })).toBeInTheDocument();
    expect(Boolean(screen.queryByRole('link', { name: 'Classes' }))).toBe(role === 'instructor');
    expect(Boolean(screen.queryByRole('link', { name: 'Problem library' }))).toBe(
      role === 'instructor',
    );
    expect(Boolean(screen.queryByRole('link', { name: 'Assignments' }))).toBe(
      role === 'instructor',
    );
    expect(Boolean(screen.queryByRole('link', { name: 'Billing (simulated)' }))).toBe(
      role === 'instructor',
    );
    expect(Boolean(screen.queryByRole('link', { name: 'Assigned work' }))).toBe(role === 'student');
    expect(Boolean(screen.queryByRole('link', { name: 'My classes' }))).toBe(role === 'student');
  },
);

function DirtyProtectedEditor() {
  useUnsavedWork(true);
  return <p>Unsaved protected work</p>;
}

test.each([false, true])(
  'forced session expiry redirects even with a pending confirmation: %s',
  async (pending) => {
    account('instructor');
    function SessionBoundary() {
      const [expired, setExpired] = useState(false);
      return (
        <>
          <button
            onClick={() => {
              account(null);
              setExpired(true);
            }}
          >
            Expire session
          </button>
          <p>{expired ? 'Expired' : 'Active'}</p>
          <Routes>
            <Route path="/account" element={<h1>Account page</h1>} />
            <Route element={<ProtectedRoute {...routeDefinitions.instructorClasses.access} />}>
              <Route path="/" element={<DirtyProtectedEditor />} />
            </Route>
          </Routes>
        </>
      );
    }
    const { router } = renderWithUnsavedWork(<SessionBoundary />);
    expect(screen.getByText('Unsaved protected work')).toBeInTheDocument();
    if (pending) {
      await act(async () => {
        await router.navigate('/other');
      });
      await screen.findByRole('dialog');
    }
    fireEvent.click(screen.getByRole('button', { name: 'Expire session' }));
    await screen.findByRole('heading', { name: 'Account page' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Unsaved protected work')).not.toBeInTheDocument();
  },
);
