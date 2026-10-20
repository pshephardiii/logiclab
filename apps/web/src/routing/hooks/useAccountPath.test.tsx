import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router';
import { expect, test } from 'vitest';
import { useAccountPath } from './useAccountPath';

function Links() {
  const accountPath = useAccountPath();
  const navigate = useNavigate();
  return (
    <>
      <a href={accountPath('/enrollments')}>Join a class</a>
      <a href={accountPath('/')}>Practice</a>
      <a href={accountPath('/account')}>Normal sign-in</a>
      <button onClick={() => navigate('/demo/work')}>Enter demo</button>
      <button onClick={() => navigate('/work')}>Leave demo</button>
    </>
  );
}

test.each([
  ['/work', '/enrollments'],
  ['/demo', '/demo/enrollments'],
  ['/demo/work', '/demo/enrollments'],
  ['/demonstration', '/enrollments'],
])('resolves account links from router location %s', (location, expected) => {
  render(
    <MemoryRouter initialEntries={[location]}>
      <Links />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: 'Join a class' })).toHaveAttribute('href', expected);
  expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Normal sign-in' })).toHaveAttribute('href', '/account');
});

test('updates links when router navigation changes the account flow', () => {
  render(
    <MemoryRouter initialEntries={['/work']}>
      <Links />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Enter demo' }));
  expect(screen.getByRole('link', { name: 'Join a class' })).toHaveAttribute(
    'href',
    '/demo/enrollments',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Leave demo' }));
  expect(screen.getByRole('link', { name: 'Join a class' })).toHaveAttribute(
    'href',
    '/enrollments',
  );
});
