import { createMemoryRouter, RouterProvider } from 'react-router';
import { UnsavedWorkProvider } from '../../../features/unsaved-work/UnsavedWorkProvider';
import { act, screen, within, waitFor, render as renderDom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { installDialogStub, renderWithUnsavedWork as render } from '../../../../test/unsaved-work';
import { review, itemA } from '../../../../test/assignment-work-fixture';
import {
  initialGrading,
  adjustedGrading,
  gradingHistory,
} from '../../../../test/submission-grading-fixture';
import { SubmissionGradingPanel } from './SubmissionGradingPanel';
import * as api from '../../../api/submission-review/api';

installDialogStub();
vi.mock('../../../api/submission-review/api', () => ({
  readGrading: vi.fn(),
  saveGrading: vi.fn(),
  readGradingHistory: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.readGrading).mockResolvedValue(initialGrading);
  vi.mocked(api.saveGrading).mockResolvedValue(adjustedGrading);
  vi.mocked(api.readGradingHistory).mockResolvedValue({ revisions: [], nextOffset: null });
});
function panel(onUpdated = vi.fn(), archived = false) {
  return (
    <SubmissionGradingPanel
      assignmentId={review.assignment.id}
      submissionId={review.attempt.id}
      automaticScore={initialGrading.score}
      items={review.assignment.items}
      archived={archived}
      onUpdated={onUpdated}
    />
  );
}
async function open(archived = false) {
  const onUpdated = vi.fn();
  const user = userEvent.setup();
  const view = render(panel(onUpdated, archived));
  await screen.findByText('Grading revision 0.');
  return { ...view, user, onUpdated };
}
const saveButton = () => screen.getByRole('button', { name: 'Save instructor grading' });

test('validates bounds/precision, saves only changed occurrences and retains automatic controls separately from comments', async () => {
  const { user, onUpdated, router } = await open();
  expect(saveButton()).toBeDisabled();
  await user.click(screen.getByLabelText('Use automatic award for problem 1'));
  const input = screen.getByLabelText('Points for problem 1');
  for (const invalid of ['21', '-1', '1.001', '']) {
    await user.clear(input);
    if (invalid) await user.type(input, invalid);
    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('0 to 20');
  }
  await user.type(input, '12.25');
  await user.type(screen.getByLabelText('Comment for problem 1'), 'Review the justification.');
  await user.click(saveButton());
  await screen.findByText('Instructor grading saved.');
  expect(api.saveGrading).toHaveBeenCalledExactlyOnceWith(
    review.assignment.id,
    review.attempt.id,
    {
      revision: 0,
      items: [{ itemId: itemA, earnedPoints: 12.25, comment: 'Review the justification.' }],
    },
    expect.any(AbortSignal),
  );
  expect(onUpdated).toHaveBeenLastCalledWith(review.attempt.id, adjustedGrading);
  expect(saveButton()).toBeDisabled();
  await act(async () => {
    await router.navigate('/elsewhere');
  });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('comment-only changes and clearing/restoring an award preserve explicit null semantics', async () => {
  vi.mocked(api.readGrading).mockResolvedValue(adjustedGrading);
  const user = userEvent.setup();
  render(panel());
  await screen.findByText('Grading revision 1.');
  await user.click(screen.getByLabelText('Use automatic award for problem 1'));
  await user.clear(screen.getByLabelText('Comment for problem 1'));
  await user.click(saveButton());
  expect(api.saveGrading).toHaveBeenCalledWith(
    review.assignment.id,
    review.attempt.id,
    { revision: 1, items: [{ itemId: itemA, earnedPoints: null, comment: null }] },
    expect.any(AbortSignal),
  );
});

test.each(['Revision conflict; reload grading.', 'Network disconnected.'])(
  'an unconfirmed save keeps edits and requires explicit reconciliation: %s',
  async (message) => {
    const { user } = await open();
    vi.mocked(api.saveGrading).mockRejectedValueOnce(new Error(message));
    await user.type(screen.getByLabelText('Comment for problem 1'), 'Keep my comment');
    await user.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('Comment for problem 1')).toHaveValue('Keep my comment');
    expect(saveButton()).toBeDisabled();
    expect(api.saveGrading).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Reload current grading' }));
    await user.click(screen.getByRole('button', { name: 'Stay' }));
    expect(api.readGrading).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Comment for problem 1')).toHaveValue('Keep my comment');
    vi.mocked(api.readGrading).mockResolvedValueOnce(adjustedGrading);
    await user.click(screen.getByRole('button', { name: 'Reload current grading' }));
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    await screen.findByText('Grading revision 1.');
    expect(screen.getByLabelText('Comment for problem 1')).toHaveValue('Review the justification.');
    await user.clear(screen.getByLabelText('Points for problem 1'));
    await user.type(screen.getByLabelText('Points for problem 1'), '0');
    await user.click(saveButton());
    expect(api.saveGrading).toHaveBeenLastCalledWith(
      review.assignment.id,
      review.attempt.id,
      expect.objectContaining({
        revision: 1,
        items: [{ itemId: itemA, earnedPoints: 0, comment: 'Review the justification.' }],
      }),
      expect.any(AbortSignal),
    );
  },
);

test('archive preserves owner history and disables mutations', async () => {
  const { user } = await open(true);
  expect(screen.getByLabelText('Comment for problem 1')).toBeDisabled();
  expect(saveButton()).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Load grading history' }));
  expect(await screen.findByText('No instructor adjustments yet.')).toBeInTheDocument();
  expect(api.saveGrading).not.toHaveBeenCalled();
});

test('history pages retain changes, retry failures and reset after a successful save', async () => {
  const { user } = await open();
  vi.mocked(api.readGradingHistory)
    .mockResolvedValueOnce({ revisions: [gradingHistory], nextOffset: 20 })
    .mockRejectedValueOnce(new Error('History unavailable.'))
    .mockResolvedValueOnce({ revisions: [], nextOffset: null });
  await user.click(screen.getByRole('button', { name: 'Load grading history' }));
  const history = within(screen.getByRole('region', { name: 'Grading history' }));
  expect(await history.findByText('Revision 1')).toBeInTheDocument();
  expect(history.getByText('Review the justification.')).toBeInTheDocument();
  await user.click(history.getByRole('button', { name: 'Load more grading history' }));
  expect(await history.findByRole('alert')).toHaveTextContent('History unavailable.');
  await user.click(history.getByRole('button', { name: 'Load more grading history' }));
  await waitFor(() =>
    expect(
      history.queryByRole('button', { name: 'Load more grading history' }),
    ).not.toBeInTheDocument(),
  );
  expect(api.readGradingHistory).toHaveBeenLastCalledWith(
    review.assignment.id,
    review.attempt.id,
    20,
    expect.any(AbortSignal),
  );
  expect(history.getByText('Revision 1')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Comment for problem 1'), 'Change');
  await user.click(saveButton());
  await screen.findByText('Instructor grading saved.');
  expect(history.queryByText('Revision 1')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Load grading history' })).toBeInTheDocument();
});

test('failed initial reads can be retried without discarding a draft', async () => {
  vi.mocked(api.readGrading).mockRejectedValueOnce(new Error('Unavailable'));
  const user = userEvent.setup();
  render(panel());
  expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable');
  await user.click(screen.getByRole('button', { name: 'Reload current grading' }));
  expect(await screen.findByText('Grading revision 0.')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('StrictMode replacement and unmount ignore late reads and save results', async () => {
  let finishRead!: (value: typeof initialGrading) => void;
  let finishSave!: (value: typeof adjustedGrading) => void;
  vi.mocked(api.readGrading).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishRead = resolve;
      }),
  );
  const onUpdated = vi.fn();
  const user = userEvent.setup();
  const router = createMemoryRouter([
    { path: '*', element: <UnsavedWorkProvider>{panel(onUpdated)}</UnsavedWorkProvider> },
  ]);
  const view = renderDom(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
  await screen.findByText('Grading revision 0.');
  expect(vi.mocked(api.readGrading).mock.calls[0]![2].aborted).toBe(true);
  await act(async () => finishRead(adjustedGrading));
  expect(screen.getByText('Grading revision 0.')).toBeInTheDocument();
  expect(onUpdated).toHaveBeenCalledTimes(1);
  vi.mocked(api.saveGrading).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishSave = resolve;
      }),
  );
  await user.type(screen.getByLabelText('Comment for problem 1'), 'Unsaved');
  await user.dblClick(saveButton());
  expect(api.saveGrading).toHaveBeenCalledTimes(1);
  const signal = vi.mocked(api.saveGrading).mock.calls[0]![3];
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => finishSave(adjustedGrading));
  expect(onUpdated).toHaveBeenCalledTimes(1);
});
