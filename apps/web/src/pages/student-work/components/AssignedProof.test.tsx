import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { installDialogStub, renderWithUnsavedWork as render } from '../../../../test/unsaved-work';
import {
  proofWork,
  proofSaved,
  proofFinal,
  proofAnswer,
  proofSolution,
  checkedProof,
  itemA,
} from '../../../../test/proof-work-fixture';
import * as api from '../../../api/student-work/api';
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
  vi.mocked(api.readAssignedWork).mockResolvedValue({ assignment: proofWork, attempt: proofSaved });
  vi.mocked(api.checkAssignedAnswers).mockResolvedValue(checkedProof);
  vi.mocked(api.readAssignedSolution).mockResolvedValue(proofSolution);
});
async function open() {
  const user = userEvent.setup();
  const view = render(<AssignedAttempt assignmentId={proofWork.id} />);
  await screen.findByRole('heading', { name: 'Problem 1: First proof' });
  return { user, ...view };
}
test('proof edits use existing unsaved-work protection and retain drafts after failed saves or Stay', async () => {
  const { user } = await open();
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P');
  expect(screen.getByRole('button', { name: 'Save problem' })).toBeDisabled();
  await user.type(screen.getByLabelText('Formula for line 1'), ' &');
  expect(screen.getByText('Unsaved changes in 1 problem(s).')).toBeInTheDocument();
  const unloading = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unloading);
  expect(unloading.defaultPrevented).toBe(true);
  vi.mocked(api.saveAssignedAnswers).mockRejectedValueOnce(new Error('Save failed.'));
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P &');
  await user.click(
    screen.getByRole('button', { name: 'Reload saved work (discard unsaved edits)' }),
  );
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P &');
  expect(api.readAssignedWork).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Next problem' }));
  await user.click(screen.getByRole('button', { name: 'Start proof' }));
  await user.type(screen.getByLabelText('Formula for line 1'), ' Q');
  expect(screen.getByText('Unsaved changes in 2 problem(s).')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Previous problem' }));
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P &');
  await user.click(
    screen.getByRole('button', { name: 'Reload saved work (discard unsaved edits)' }),
  );
  await user.click(screen.getByRole('button', { name: 'Discard changes' }));
  await waitFor(() => expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P'));
  expect(screen.queryByText(/Unsaved changes in/)).not.toBeInTheDocument();
});
test('successful explicit saves keep proof identities, clear unload protection and reload the confirmed response', async () => {
  const { user } = await open();
  await user.type(screen.getByLabelText('Formula for line 1'), ' &');
  const edited = structuredClone(proofAnswer);
  edited.proof.steps[0]!.formula = 'P &';
  const saved = { ...proofSaved, revision: 2, answers: { [itemA]: edited } };
  vi.mocked(api.saveAssignedAnswers).mockResolvedValue(saved);
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  await screen.findByText('Problem 1 saved.');
  expect(api.saveAssignedAnswers).toHaveBeenCalledWith(
    proofWork.id,
    { revision: 1, itemId: itemA, answers: edited },
    expect.any(AbortSignal),
  );
  expect(screen.getByRole('button', { name: 'Save problem' })).toBeDisabled();
  const unloading = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unloading);
  expect(unloading.defaultPrevented).toBe(false);
  vi.mocked(api.readAssignedWork).mockResolvedValue({ assignment: proofWork, attempt: saved });
  await user.click(
    screen.getByRole('button', { name: 'Reload saved work (discard unsaved edits)' }),
  );
  await waitFor(() => expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P &'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
});
test('manual proof checking and separately fetched solutions never save or replace student entries', async () => {
  const { user } = await open();
  expect(screen.queryByRole('button', { name: 'Check answers' })).not.toBeInTheDocument();
  expect(screen.queryByText('PRIVATE_REFERENCE_EXPLANATION')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  await screen.findByText('Proof verified.');
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Formula for line 1'), ' &');
  expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Show assigned solution' }));
  await screen.findByText('PRIVATE_REFERENCE_EXPLANATION');
  expect(screen.getByLabelText('Formula for line 1')).toHaveValue('P &');
  expect(screen.getByText('Unsaved changes in 1 problem(s).')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Hide assigned solution' }));
  expect(screen.queryByText('PRIVATE_REFERENCE_EXPLANATION')).not.toBeInTheDocument();
});
test('changing problems cancels a pending proof check and ignores its late result', async () => {
  let resolve!: (value: typeof checkedProof) => void;
  vi.mocked(api.checkAssignedAnswers).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { user } = await open();
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  const signal = vi.mocked(api.checkAssignedAnswers).mock.calls[0]![2];
  await user.click(screen.getByRole('button', { name: 'Next problem' }));
  expect(signal.aborted).toBe(true);
  resolve(checkedProof);
  await user.click(screen.getByRole('button', { name: 'Previous problem' }));
  expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument();
});
test.each([false, true])(
  'submitted proofs stay read-only with released=%s; withheld reports and pending-review points remain distinct',
  async (released) => {
    const assignment = {
      ...proofWork,
      assessmentMode: 'graded' as const,
      feedbackTiming: 'on_submission' as const,
      solutionAccess: 'never' as const,
      gradeReleaseTiming: 'instructor_release' as const,
    };
    vi.mocked(api.readAssignedWork).mockResolvedValue({
      assignment,
      attempt: released
        ? proofFinal
        : { ...proofFinal, result: null, score: null, gradePending: true },
    });
    const { user } = await open();
    expect(screen.queryByRole('button', { name: 'Save problem' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check proof' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit final answers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    if (!released) {
      expect(
        screen.getByRole('heading', { name: 'Submitted — awaiting grade release' }),
      ).toBeInTheDocument();
      expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument();
      expect(screen.queryByText(/35 points available/)).not.toBeInTheDocument();
    } else {
      expect(screen.getByText('Proof verified.')).toBeInTheDocument();
      expect(screen.getByText('Needs instructor review · 35 points available')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Next problem' }));
      expect(screen.getByText('Proof needs attention.')).toBeInTheDocument();
      expect(screen.getByText('No proof lines entered.')).toBeInTheDocument();
      expect(screen.queryByText(/0 \/ 35/)).not.toBeInTheDocument();
    }
    expect(api.submitAssignedWork).not.toHaveBeenCalled();
    expect(api.readAssignedSolution).not.toHaveBeenCalled();
  },
);

test('graded proof submission requires explicitly saved edits and final confirmation before displaying the retained review state', async () => {
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: {
      ...proofWork,
      assessmentMode: 'graded',
      feedbackTiming: 'on_submission',
      solutionAccess: 'never',
    },
    attempt: proofSaved,
  });
  const { user } = await open();
  expect(screen.queryByRole('button', { name: 'Check proof' })).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Formula for line 1'), ' ');
  expect(screen.getByRole('button', { name: 'Submit final answers' })).toBeDisabled();
  expect(
    screen.getByLabelText('I understand submission is final and cannot be edited.'),
  ).toBeDisabled();
  const edited = structuredClone(proofAnswer);
  edited.proof.steps[0]!.formula = 'P ';
  const saved = { ...proofSaved, revision: 2, answers: { [itemA]: edited } };
  vi.mocked(api.saveAssignedAnswers).mockResolvedValue(saved);
  vi.mocked(api.submitAssignedWork).mockResolvedValue({
    ...proofFinal,
    revision: 3,
    answers: saved.answers,
  });
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  await screen.findByText('Problem 1 saved.');
  expect(screen.getByRole('button', { name: 'Submit final answers' })).toBeDisabled();
  await user.click(screen.getByLabelText('I understand submission is final and cannot be edited.'));
  await user.click(screen.getByRole('button', { name: 'Submit final answers' }));
  await screen.findByText('Final submission recorded.');
  expect(api.submitAssignedWork).toHaveBeenCalledWith(proofWork.id, 2, expect.any(AbortSignal));
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByText('Needs instructor review · 35 points available')).toBeInTheDocument();
  expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
});
