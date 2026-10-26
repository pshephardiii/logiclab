import { installDialogStub, renderWithUnsavedWork as render } from '../../../../test/unsaved-work';
import { submissionFeedback } from '../../../features/assignment/helpers/submission-feedback';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import * as api from '../../../api/student-work/api';
import {
  work,
  saved,
  submitted,
  itemA,
  itemB,
  solution,
} from '../../../../test/assignment-work-fixture';
import { AssignedAttempt } from './AssignedAttempt';

installDialogStub();

vi.mock('../../../api/student-work/api', () => ({
  readAssignedWork: vi.fn(),
  saveAssignedAnswers: vi.fn(),
  submitAssignedWork: vi.fn(),
  checkAssignedAnswers: vi.fn(),
  readAssignedSolution: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.readAssignedWork).mockResolvedValue({ assignment: work, attempt: null });
  vi.mocked(api.saveAssignedAnswers).mockResolvedValue(saved);
  vi.mocked(api.submitAssignedWork).mockResolvedValue(submitted);
  vi.mocked(api.readAssignedSolution).mockResolvedValue(solution);
  vi.mocked(api.checkAssignedAnswers).mockResolvedValue({
    itemId: itemA,
    feedback: submissionFeedback(submitted.result, itemA)!,
  });
});
function cells() {
  return within(screen.getByRole('group', { name: 'Truth-table answers' })).getAllByRole(
    'combobox',
  );
}
async function open() {
  const user = userEvent.setup();
  const view = render(<AssignedAttempt assignmentId={work.id} />);
  await screen.findByRole('heading', { name: 'Problem 1: First occurrence' });
  return { user, ...view };
}

test('saves false and blanks, retains failed input, and requires saved work plus final confirmation', async () => {
  const { user } = await open();
  expect(screen.queryByRole('button', { name: 'Check answers' })).not.toBeInTheDocument();
  await user.selectOptions(cells()[0]!, 'F');
  expect(screen.getByRole('button', { name: 'Submit final answers' })).toBeDisabled();
  expect(
    screen.getByLabelText('I understand submission is final and cannot be edited.'),
  ).toBeDisabled();
  vi.mocked(api.saveAssignedAnswers)
    .mockRejectedValueOnce(new Error('Stale revision; reload.'))
    .mockResolvedValueOnce(saved);
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Stale revision');
  expect(cells()[0]).toHaveValue('F');
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  await screen.findByText('Problem 1 saved.');
  expect(api.saveAssignedAnswers).toHaveBeenLastCalledWith(
    work.id,
    { revision: 0, itemId: itemA, answers: saved.answers[itemA] },
    expect.any(AbortSignal),
  );
  expect(screen.queryByText('Incorrect', { exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Submit final answers' })).toBeDisabled();
  await user.click(screen.getByLabelText('I understand submission is final and cannot be edited.'));
  await user.click(screen.getByRole('button', { name: 'Submit final answers' }));
  await screen.findByText('Final submission recorded.');
  expect(api.submitAssignedWork).toHaveBeenCalledWith(work.id, 1, expect.any(AbortSignal));
  expect(cells()[0]).toBeDisabled();
  expect(cells()[0]).toHaveValue('F');
  expect(screen.getByText('Incorrect', { exact: true })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Show assigned solution' })).not.toBeInTheDocument();
  expect(api.readAssignedSolution).not.toHaveBeenCalled();
});

test('repeated problems keep separate edits and saving one does not clear another dirty occurrence', async () => {
  const { user } = await open();
  await user.selectOptions(cells()[0]!, 'F');
  await user.click(screen.getByRole('button', { name: 'Next problem' }));
  expect(cells()[0]).toHaveValue('');
  await user.selectOptions(cells()[0]!, 'T');
  await user.click(screen.getByRole('button', { name: 'Previous problem' }));
  expect(cells()[0]).toHaveValue('F');
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  await screen.findByText('Problem 1 saved.');
  expect(screen.getByText('Unsaved changes in 1 problem(s).')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Next problem' }));
  expect(cells()[0]).toHaveValue('T');
  expect(screen.getByRole('button', { name: 'Submit final answers' })).toBeDisabled();
});

test('reloading restores saved answers and official results without public rechecking', async () => {
  vi.mocked(api.readAssignedWork).mockResolvedValue({ assignment: work, attempt: submitted });
  await open();
  expect(cells()[0]).toHaveValue('F');
  expect(cells()[0]).toBeDisabled();
  expect(screen.getByText('Incorrect', { exact: true })).toBeInTheDocument();
  expect(api.submitAssignedWork).not.toHaveBeenCalled();
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
});

test('enabled solutions are fetched only after final submission and preserve saved entries', async () => {
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: { ...work, solutionAccess: 'after_submission' },
    attempt: submitted,
  });
  const { user } = await open();
  expect(api.readAssignedSolution).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Show assigned solution' }));
  await screen.findByRole('button', { name: 'Hide assigned solution' });
  expect(api.readAssignedSolution).toHaveBeenCalledWith(work.id, itemA, expect.any(AbortSignal));
  expect(cells()[0]).toHaveValue('F');
  expect(screen.getByText('Solution: T')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Hide assigned solution' }));
  expect(screen.queryByText('Solution: T')).not.toBeInTheDocument();
});

test('switching assignments aborts pending saves and ignores their late result', async () => {
  let resolve!: (value: typeof saved) => void;
  vi.mocked(api.saveAssignedAnswers).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { user, unmount } = await open();
  await user.selectOptions(cells()[0]!, 'F');
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  const signal = vi.mocked(api.saveAssignedAnswers).mock.calls[0]![2];
  unmount();
  expect(signal.aborted).toBe(true);
  render(<AssignedAttempt assignmentId="new-assignment" />);
  await screen.findByRole('heading', { name: 'Problem 1: First occurrence' });
  await act(async () => resolve(saved));
  expect(cells()[0]).toHaveValue('');
  expect(screen.queryByText('Problem 1 saved.')).not.toBeInTheDocument();
});

test('a reverted blank clears dirty state and an unconfirmed submission can be checked by reload', async () => {
  const { user } = await open();
  await user.selectOptions(cells()[0]!, 'F');
  await user.selectOptions(cells()[0]!, '');
  expect(screen.queryByText('Unsaved changes in 1 problem(s).')).not.toBeInTheDocument();
  vi.mocked(api.submitAssignedWork).mockRejectedValueOnce(new Error('Connection lost'));
  await user.click(screen.getByLabelText('I understand submission is final and cannot be edited.'));
  await user.click(screen.getByRole('button', { name: 'Submit final answers' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost');
  vi.mocked(api.readAssignedWork).mockResolvedValue({ assignment: work, attempt: submitted });
  await user.click(
    screen.getByRole('button', { name: 'Reload saved work (discard unsaved edits)' }),
  );
  await waitFor(() => expect(cells()[0]).toBeDisabled());
  expect(api.submitAssignedWork).toHaveBeenCalledTimes(1);
});

test('practice checks transient answers repeatedly, clears feedback on edit, and permits anytime solutions without submission', async () => {
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: {
      ...work,
      assessmentMode: 'ungraded_practice',
      feedbackTiming: 'on_check',
      solutionAccess: 'anytime',
    },
    attempt: null,
  });
  const { user } = await open();
  expect(screen.queryByRole('button', { name: 'Submit final answers' })).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  await user.selectOptions(cells()[0]!, 'F');
  await user.click(screen.getByRole('button', { name: 'Check answers' }));
  expect(await screen.findByText('Incorrect', { exact: true })).toBeInTheDocument();
  expect(api.checkAssignedAnswers).toHaveBeenCalledWith(
    work.id,
    {
      itemId: itemA,
      answers: saved.answers[itemA],
    },
    expect.any(AbortSignal),
  );
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
  expect(api.submitAssignedWork).not.toHaveBeenCalled();
  expect(screen.getByText('Unsaved changes in 1 problem(s).')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Check answers' }));
  expect(api.checkAssignedAnswers).toHaveBeenCalledTimes(2);
  await user.click(screen.getByRole('button', { name: 'Show assigned solution' }));
  await screen.findByRole('button', { name: 'Hide assigned solution' });
  expect(cells()[0]).toHaveValue('F');
  await user.click(screen.getByRole('button', { name: 'Hide assigned solution' }));
  await user.selectOptions(cells()[0]!, 'T');
  expect(screen.queryByText('Incorrect', { exact: true })).not.toBeInTheDocument();
});

test('editing cancels a pending check and late feedback cannot overwrite the edited table', async () => {
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: { ...work, assessmentMode: 'ungraded_practice', feedbackTiming: 'on_check' },
    attempt: null,
  });
  let resolve!: (value: Awaited<ReturnType<typeof api.checkAssignedAnswers>>) => void;
  vi.mocked(api.checkAssignedAnswers).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { user } = await open();
  await user.selectOptions(cells()[0]!, 'F');
  await user.click(screen.getByRole('button', { name: 'Check answers' }));
  const signal = vi.mocked(api.checkAssignedAnswers).mock.calls[0]![2];
  expect(cells()[0]).toBeEnabled();
  await user.selectOptions(cells()[0]!, 'T');
  expect(signal.aborted).toBe(true);
  await act(async () =>
    resolve({ itemId: itemA, feedback: submissionFeedback(submitted.result, itemA)! }),
  );
  expect(cells()[0]).toHaveValue('T');
  expect(screen.queryByText('Incorrect', { exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Check answers' })).toBeEnabled();
});

test('completion requires every occurrence to be filled and saved before final confirmation', async () => {
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: { ...work, assessmentMode: 'completion_only', feedbackTiming: 'on_check' },
    attempt: null,
  });
  vi.mocked(api.saveAssignedAnswers).mockImplementation(async (_id, input) => ({
    ...saved,
    revision: input.revision + 1,
    answers: { [input.itemId]: input.answers },
  }));
  vi.mocked(api.submitAssignedWork).mockResolvedValue({
    ...saved,
    revision: 3,
    submittedAt: submitted.submittedAt,
    answers: {
      [itemA]: saved.answers[itemA]!.map((answer) => ({ ...answer, value: false })),
      [itemB]: saved.answers[itemA]!.map((answer) => ({ ...answer, value: false })),
    },
    result: {
      gradingVersion: 'completion_v1',
      items: [
        { itemId: itemA, completedCells: 2, totalCells: 2 },
        { itemId: itemB, completedCells: 2, totalCells: 2 },
      ],
      summary: { completedCells: 4, totalCells: 4 },
    },
  });
  const { user } = await open();
  const confirmation = screen.getByLabelText(
    'I understand submission is final and cannot be edited.',
  );
  expect(confirmation).toBeDisabled();
  await user.selectOptions(cells()[0]!, 'F');
  await user.selectOptions(cells()[1]!, 'F');
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  await screen.findByText('Problem 1 saved.');
  expect(confirmation).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Next problem' }));
  await user.selectOptions(cells()[0]!, 'F');
  await user.selectOptions(cells()[1]!, 'F');
  expect(confirmation).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  await screen.findByText('Problem 2 saved.');
  expect(confirmation).toBeEnabled();
  await user.click(confirmation);
  await user.click(screen.getByRole('button', { name: 'Submit final answers' }));
  expect(
    await screen.findByText('Completed 4 of 4 cells. No correctness score is recorded.'),
  ).toBeInTheDocument();
  expect(cells()[0]).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Check answers' })).not.toBeInTheDocument();
  expect(screen.queryByText('Incorrect', { exact: true })).not.toBeInTheDocument();
});

test('failed checks preserve entries and can be retried, while reload cancels outstanding feedback', async () => {
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: { ...work, assessmentMode: 'ungraded_practice', feedbackTiming: 'on_check' },
    attempt: null,
  });
  vi.mocked(api.checkAssignedAnswers).mockRejectedValueOnce(new Error('Check unavailable'));
  const { user } = await open();
  await user.selectOptions(cells()[0]!, 'F');
  await user.click(screen.getByRole('button', { name: 'Check answers' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Check unavailable');
  expect(cells()[0]).toHaveValue('F');
  await user.click(screen.getByRole('button', { name: 'Check answers' }));
  expect(await screen.findByText('Incorrect', { exact: true })).toBeInTheDocument();
  let resolve!: (value: Awaited<ReturnType<typeof api.checkAssignedAnswers>>) => void;
  vi.mocked(api.checkAssignedAnswers).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await user.click(screen.getByRole('button', { name: 'Check answers' }));
  const signal = vi.mocked(api.checkAssignedAnswers).mock.calls.at(-1)![2];
  await user.click(
    screen.getByRole('button', { name: 'Reload saved work (discard unsaved edits)' }),
  );
  await user.click(screen.getByRole('button', { name: 'Discard changes' }));
  await screen.findByRole('heading', { name: 'Problem 1: First occurrence' });
  expect(signal.aborted).toBe(true);
  await act(async () =>
    resolve({ itemId: itemA, feedback: submissionFeedback(submitted.result, itemA)! }),
  );
  expect(cells()[0]).toHaveValue('');
  expect(screen.queryByText('Incorrect', { exact: true })).not.toBeInTheDocument();
});

test('immediate work keeps blanks neutral and manual checking available without showing expected values', async () => {
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: { ...work, assessmentMode: 'ungraded_practice', feedbackTiming: 'immediate' },
    attempt: null,
  });
  const { user } = await open();
  expect(screen.getByText(/Incorrect entries are highlighted shortly/)).toBeInTheDocument();
  await user.selectOptions(cells()[0]!, 'F');
  await user.click(screen.getByRole('button', { name: 'Check answers' }));
  expect(await screen.findByText('Incorrect', { exact: true })).toBeInTheDocument();
  expect(screen.queryByText('Unanswered', { exact: true })).not.toBeInTheDocument();
  expect(cells()[0]).toHaveAttribute('aria-invalid', 'true');
  expect(cells()[1]).not.toHaveAttribute('aria-describedby');
  expect(screen.queryByText(/Solution:/)).not.toBeInTheDocument();
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
  expect(api.submitAssignedWork).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Next problem' }));
  expect(cells()[0]).toHaveValue('');
});

test('dirty reload requires permission; Stay preserves answers and failed reload keeps protection', async () => {
  const { user } = await open();
  await user.selectOptions(cells()[0]!, 'F');
  const before = vi.mocked(api.readAssignedWork).mock.calls.length;
  const reload = () =>
    screen.getByRole('button', { name: 'Reload saved work (discard unsaved edits)' });
  await user.click(reload());
  await screen.findByRole('dialog');
  expect(api.readAssignedWork).toHaveBeenCalledTimes(before);
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(cells()[0]).toHaveValue('F');
  vi.mocked(api.readAssignedWork).mockRejectedValueOnce(new Error('Reload unavailable'));
  await user.click(reload());
  await user.click(screen.getByRole('button', { name: 'Discard changes' }));
  await screen.findByRole('button', { name: 'Retry assigned work' });
  const unload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Retry assigned work' }));
  await screen.findByRole('dialog');
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(api.readAssignedWork).toHaveBeenCalledTimes(before + 1);
});

test('saved and reverted answers clear protection, while a failed save retains it', async () => {
  const { user } = await open();
  function protectedWork() {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  }
  expect(protectedWork()).toBe(false);
  await user.selectOptions(cells()[0]!, 'F');
  expect(protectedWork()).toBe(true);
  await user.selectOptions(cells()[0]!, '');
  expect(protectedWork()).toBe(false);
  await user.selectOptions(cells()[0]!, 'F');
  vi.mocked(api.saveAssignedAnswers).mockRejectedValueOnce(new Error('Save unavailable'));
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  await screen.findByRole('alert');
  expect(protectedWork()).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  await screen.findByText('Problem 1 saved.');
  await waitFor(() => expect(protectedWork()).toBe(false));
});
