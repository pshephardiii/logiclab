import { fireEvent, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Link } from 'react-router';
import { ProofPractice } from './ProofPractice';
import { installDialogStub, renderWithUnsavedWork } from '../../../../test/unsaved-work';

installDialogStub();

function enterProblem(format = 'fitch') {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.change(screen.getByLabelText('Proof format'), { target: { value: format } });
  fireEvent.click(screen.getByRole('button', { name: 'Add premise' }));
  fireEvent.change(screen.getByLabelText('Premise 1'), { target: { value: 'P' } });
  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'P' } });
  fireEvent.click(screen.getByRole('button', { name: 'Begin proof practice' }));
}

test.each(['fitch', 'dependency', 'tree'])(
  '%s practice starts locally and checks only on request',
  (format) => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected network request'));
    enterProblem(format);

    expect(screen.queryByLabelText('Proof format')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Start proof' }));
    expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));

    expect(screen.getByRole('region', { name: 'Proof feedback' })).toHaveTextContent(
      format === 'tree' ? 'Proof needs attention.' : 'Proof verified.',
    );
    expect(fetch).not.toHaveBeenCalled();
  },
);

test('editing clears old diagnostics and never checks automatically', () => {
  enterProblem();
  fireEvent.click(screen.getByRole('button', { name: 'Start proof' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByText('Proof verified.')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Formula for line 1'), { target: { value: 'Q' } });
  expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByRole('region', { name: 'Proof feedback' })).toHaveTextContent(
    'Proof needs attention.',
  );
});

test('malformed setup retains the entered fields with an actionable error', () => {
  renderWithUnsavedWork(<ProofPractice />);
  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'P &' } });
  fireEvent.click(screen.getByRole('button', { name: 'Begin proof practice' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Conclusion:');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('P &');
  expect(screen.queryByRole('button', { name: 'Start proof' })).not.toBeInTheDocument();
  expect(screen.getByText(/does not search for a solution/)).toBeInTheDocument();
});

test('setup edits require discard consent before navigation', async () => {
  const { router } = renderWithUnsavedWork(
    <>
      <Link to="/elsewhere">Leave practice</Link>
      <ProofPractice />
    </>,
  );
  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'P' } });
  fireEvent.click(screen.getByRole('link', { name: 'Leave practice' }));

  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));
  expect(router.state.location.pathname).toBe('/');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('P');

  fireEvent.click(screen.getByRole('link', { name: 'Leave practice' }));
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard changes' }),
  );
  expect(router.state.location.pathname).toBe('/elsewhere');
});

test('checked active work still requests an unload warning and does not persist through remount', () => {
  const rendered = renderWithUnsavedWork(<ProofPractice />);
  fireEvent.change(screen.getByLabelText('Conclusion'), { target: { value: 'P -> P' } });
  fireEvent.click(screen.getByRole('button', { name: 'Begin proof practice' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start proof' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  const unload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);

  rendered.unmount();
  renderWithUnsavedWork(<ProofPractice />);
  expect(screen.getByLabelText('Conclusion')).toHaveValue('');
  expect(screen.queryByRole('region', { name: 'Proof feedback' })).not.toBeInTheDocument();
});
