import { useState } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { installDialogStub, renderWithUnsavedWork } from '../../../../test/unsaved-work';
import { useUnsavedWork } from '../../../features/unsaved-work/hooks/useUnsavedWork';
import { AccountPanel } from './AccountPanel';

installDialogStub();
function DirtyEditor() {
  useUnsavedWork(true);
  return <p>Retained editor</p>;
}
function fixture(dirty: boolean, failed = false) {
  const run = vi.fn().mockResolvedValue(undefined);
  function Screen() {
    const [signedIn, setSignedIn] = useState(true);
    return (
      <>
        {dirty && signedIn && <DirtyEditor />}
        <AccountPanel
          account={{
            user: signedIn ? { id: 'user', role: 'instructor' } : null,
            view: 'login',
            email: '',
            busy: false,
            error: failed ? 'Sign out unavailable' : null,
            notice: null,
            navigate: vi.fn(),
            run: async (action, fields) => {
              await run(action, fields);
              if (!failed) setSignedIn(false);
            },
          }}
        />
      </>
    );
  }
  renderWithUnsavedWork(<Screen />);
  return run;
}

test('clean sign out proceeds without confirmation', async () => {
  const run = fixture(false);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(run).toHaveBeenCalledWith('logout', {}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('sign out waits for consent and Stay preserves the session and dirty editor', async () => {
  const run = fixture(true);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('dialog');
  expect(run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByText('Retained editor')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  await waitFor(() => expect(screen.queryByText('Retained editor')).not.toBeInTheDocument());
  expect(run).toHaveBeenCalledExactlyOnceWith('logout', {});
});

test('failed sign out leaves dirty work protected and retry requires fresh consent', async () => {
  const run = fixture(true, true);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
  expect(screen.getByText('Retained editor')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('dialog');
  expect(run).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
});
