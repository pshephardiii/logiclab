import { useConfirmDiscard } from './hooks/useConfirmDiscard';
import { installDialogStub } from '../../../test/unsaved-work';
import { StrictMode, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, RouterProvider, useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { UnsavedWorkProvider } from './UnsavedWorkProvider';
import { useUnsavedWork } from './hooks/useUnsavedWork';

installDialogStub();
function Editor({ label }: { label: string }) {
  const [dirty, setDirty] = useState(false);
  useUnsavedWork(dirty);
  return (
    <label>
      {label}
      <input type="checkbox" checked={dirty} onChange={(e) => setDirty(e.target.checked)} />
    </label>
  );
}
function LocalAction({ onRun }: { onRun: () => void }) {
  const confirm = useConfirmDiscard();
  return <button onClick={() => confirm(onRun)}>Replace local work</button>;
}

function Screen() {
  const location = useLocation();
  const [second, setSecond] = useState(true);
  const [owner, setOwner] = useState(true);
  const [actions, setActions] = useState(0);
  return (
    <>
      <p data-testid="location">
        {location.pathname}
        {location.search}
        {location.hash}
      </p>
      <p>Local actions: {actions}</p>
      {owner && <LocalAction onRun={() => setActions((value) => value + 1)} />}
      <button onClick={() => setOwner(false)}>Remove local owner</button>
      <Editor label="First editor dirty" />
      {second && <Editor label="Second editor dirty" />}
      <button onClick={() => setSecond(false)}>Remove second editor</button>
      <Link to="/next">Next page</Link>
      <Link to="?filter=all">Change query</Link>
      <Link to="#details">Jump to details</Link>
    </>
  );
}
function setup(entries = ['/edit'], index = entries.length - 1) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <UnsavedWorkProvider>
            <Screen />
          </UnsavedWorkProvider>
        ),
      },
    ],
    { initialEntries: entries, initialIndex: index },
  );
  const view = render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
  return { router, user: userEvent.setup(), ...view };
}
function unload() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

test('clean navigation proceeds without a prompt or unload warning', async () => {
  const { user } = setup();
  expect(unload()).toBe(false);
  await user.click(screen.getByRole('link', { name: 'Next page' }));
  expect(screen.getByTestId('location')).toHaveTextContent('/next');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('Stay and Escape preserve dirty state; Discard resumes the requested destination', async () => {
  const { user } = setup();
  await user.click(screen.getByLabelText('First editor dirty'));
  expect(unload()).toBe(true);
  await user.click(screen.getByRole('link', { name: 'Next page' }));
  const dialog = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
  expect(screen.getByTestId('location')).toHaveTextContent('/edit');
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('First editor dirty')).toBeChecked();
  await user.click(screen.getByRole('link', { name: 'Next page' }));
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Next page' }));
  await user.click(screen.getByRole('button', { name: 'Discard changes' }));
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/next'));
  expect(dialog).not.toBeInTheDocument();
});

test('multiple editors remain protected until all are clean or unmounted', async () => {
  const { user, unmount } = setup();
  await user.click(screen.getByLabelText('First editor dirty'));
  await user.click(screen.getByLabelText('Second editor dirty'));
  await user.click(screen.getByLabelText('First editor dirty'));
  expect(unload()).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Remove second editor' }));
  expect(unload()).toBe(false);
  await user.click(screen.getByLabelText('First editor dirty'));
  unmount();
  expect(unload()).toBe(false);
});

test('history Back and query changes are protected while hash jumps remain available', async () => {
  const { user, router } = setup(['/previous', '/edit']);
  await user.click(screen.getByLabelText('First editor dirty'));
  await user.click(screen.getByRole('link', { name: 'Jump to details' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Change query' }));
  await screen.findByRole('dialog');
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  await act(async () => {
    await router.navigate(-2);
  });
  await screen.findByRole('dialog');
  await user.click(screen.getByRole('button', { name: 'Discard changes' }));
  await waitFor(() => expect(router.state.location.pathname).toBe('/previous'));
});

test('becoming clean while blocked dismisses the prompt without silently navigating', async () => {
  const { user } = setup();
  await user.click(screen.getByLabelText('First editor dirty'));
  await user.click(screen.getByRole('link', { name: 'Next page' }));
  await screen.findByRole('dialog');
  // Simulate a save completing behind the modal.
  fireEvent.click(screen.getByLabelText('First editor dirty'));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByTestId('location')).toHaveTextContent('/edit');
  expect(unload()).toBe(false);
});

test('local discard executes once and leaves subsequent changes protected', async () => {
  const { user } = setup();
  await user.click(screen.getByLabelText('First editor dirty'));
  await user.click(screen.getByRole('button', { name: 'Replace local work' }));
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByText('Local actions: 0')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Replace local work' }));
  await user.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(screen.getByText('Local actions: 1')).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Next page' }));
  await screen.findByRole('dialog');
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(unload()).toBe(true);
});

test('unmounting a local action owner cancels its pending callback', async () => {
  const { user } = setup();
  await user.click(screen.getByLabelText('First editor dirty'));
  await user.click(screen.getByRole('button', { name: 'Replace local work' }));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', { name: 'Remove local owner' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('Local actions: 0')).toBeInTheDocument();
  expect(unload()).toBe(true);
});
