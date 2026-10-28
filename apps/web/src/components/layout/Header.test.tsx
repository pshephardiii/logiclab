import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, test, vi } from 'vitest';
import { useAccountContext } from '../../features/auth/AccountProvider';
import { Header } from './Header';

vi.mock('../../features/auth/AccountProvider', () => ({ useAccountContext: vi.fn() }));

function header(role: 'instructor' | 'student' | null, demoMode = false, path = '/') {
  const user = role ? { id: 'user', role } : null;
  vi.mocked(useAccountContext).mockReturnValue({
    user,
    demoMode,
    demo: { session: demoMode && user ? { user } : null },
  } as ReturnType<typeof useAccountContext>);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>,
  );
}

test('signed-out visitors see only the three site destinations', () => {
  header(null);
  const site = within(screen.getByRole('navigation', { name: 'Main navigation' }));
  expect(site.getAllByRole('link')).toHaveLength(3);
  expect(site.getByRole('link', { name: 'Explore demo' })).toHaveAttribute('href', '/demo');
  expect(site.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/');
  expect(site.getByRole('link', { name: 'Sign in / Create account' })).toHaveAttribute(
    'href',
    '/account',
  );
  expect(screen.getAllByRole('navigation')).toHaveLength(1);
});

test.each(['instructor', 'student'] as const)(
  'separates %s demo links from site navigation',
  (role) => {
    header(role, true, role === 'instructor' ? '/demo/classes' : '/demo/work');
    const site = within(screen.getByRole('navigation', { name: 'Main navigation' }));
    expect(site.getAllByRole('link')).toHaveLength(3);
    expect(site.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/');
    expect(site.getByRole('link', { name: 'Sign in / Create account' })).toHaveAttribute(
      'href',
      '/account',
    );
    const notice = screen.getByRole('complementary', { name: 'Demo notice' });
    const workspace = within(notice).getByRole('navigation', { name: 'Demo workspace navigation' });
    for (const link of within(workspace).getAllByRole('link')) {
      expect(link.getAttribute('href')).toMatch(/^\/demo\//);
    }
    expect(within(workspace).queryByRole('link', { name: 'Practice' })).not.toBeInTheDocument();
    expect(
      within(workspace).getByRole('link', {
        name: role === 'instructor' ? 'Classes' : 'Assigned work',
      }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(workspace).queryByRole('link', {
        name: role === 'instructor' ? 'My classes' : 'Classes',
      }),
    ).not.toBeInTheDocument();
    expect(
      within(notice).getByRole('link', { name: 'Switch role, reset, or end demo' }),
    ).toHaveAttribute('href', '/demo');
  },
);

test.each(['instructor', 'student'] as const)(
  'normal %s links remain outside the demo namespace',
  (role) => {
    header(role);
    const workspace = within(
      screen.getByRole('navigation', { name: 'Account workspace navigation' }),
    );
    expect(
      workspace.getByRole('link', { name: role === 'instructor' ? 'Classes' : 'My classes' }),
    ).toHaveAttribute('href', role === 'instructor' ? '/classes' : '/enrollments');
    for (const link of workspace.getAllByRole('link'))
      expect(link.getAttribute('href')).not.toMatch(/^\/demo/);
    expect(screen.queryByRole('complementary', { name: 'Demo notice' })).not.toBeInTheDocument();
  },
);

test('workspace navigation disappears when the demo session expires', () => {
  const view = header('instructor', true);
  vi.mocked(useAccountContext).mockReturnValue({
    user: null,
    demoMode: true,
    demo: { session: null },
  } as ReturnType<typeof useAccountContext>);
  view.rerender(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole('navigation')).toHaveLength(1);
  expect(
    screen.queryByRole('navigation', { name: 'Demo workspace navigation' }),
  ).not.toBeInTheDocument();
});
