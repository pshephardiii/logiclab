import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { installDialogStub, renderWithUnsavedWork as render } from '../../../../test/unsaved-work';
import { naturalDeductionTreeDerivationDefinition } from '../../../../test/derivation';
import { proofWork, proofSaved, proofReport, itemA } from '../../../../test/proof-work-fixture';
import type {
  SavedStudentAssignment,
  SavedStudentAttempt,
} from '@logiclab/contracts/saved-student-work';
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
const { referenceProof, explanation, ...content } = naturalDeductionTreeDerivationDefinition;
const answer = { type: 'derivation' as const, proof: referenceProof! };
const work: SavedStudentAssignment = {
  ...proofWork,
  items: proofWork.items.slice(0, 2).map((item) => ({ ...item, content })),
};
const saved: SavedStudentAttempt = { ...proofSaved, answers: { [itemA]: answer } };
const report = {
  ...proofReport,
  steps: answer.proof.nodes.map((node, stepIndex) => ({
    stepId: node.id,
    stepIndex,
    localStatus: 'valid' as const,
    dependencyStatus: 'valid' as const,
  })),
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.readAssignedWork).mockResolvedValue({ assignment: work, attempt: saved });
  vi.mocked(api.checkAssignedAnswers).mockResolvedValue({
    itemId: itemA,
    feedback: { type: 'derivation', report },
  });
  vi.mocked(api.readAssignedSolution).mockResolvedValue({
    ...content,
    referenceProof: referenceProof!,
    explanation: 'PRIVATE_TREE_REFERENCE',
  });
});
async function open() {
  const user = userEvent.setup();
  render(<AssignedAttempt assignmentId={work.id} />);
  await screen.findByRole('heading', { name: 'Problem 1: First proof' });
  return user;
}

test('retained tree drafts are readable and navigable without entry, save or check controls', async () => {
  const before = structuredClone(saved);
  const user = await open();
  expect(screen.getByRole('status')).toHaveTextContent('unavailable for new attempts');
  expect(
    screen.queryByRole('region', { name: 'Natural-deduction tree student proof editor' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save problem' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Check proof' })).not.toBeInTheDocument();
  await user.click(screen.getByText('Your retained proof'));
  expect(screen.getByRole('region', { name: 'Your retained proof diagram' })).toHaveTextContent(
    'Conditional proof',
  );
  await user.click(screen.getByRole('button', { name: 'Next problem' }));
  expect(screen.getByRole('heading', { name: 'Problem 2: Repeated proof' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start proof' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Previous problem' }));
  expect(saved).toEqual(before);
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
  expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
});

test('authorized retained references stay separate from saved student work without enabling mutations', async () => {
  const user = await open();
  await user.click(screen.getByRole('button', { name: 'Show assigned solution' }));
  expect(await screen.findByText('PRIVATE_TREE_REFERENCE')).toBeInTheDocument();
  await user.click(screen.getByText('Instructor reference proof'));
  await user.click(screen.getByText('Your retained proof'));
  expect(
    screen.getByRole('region', { name: 'Instructor reference proof diagram' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Your retained proof diagram' })).toBeInTheDocument();
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
  expect(api.submitAssignedWork).not.toHaveBeenCalled();
  expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
});

test('retained pending grades and locked answers remain protected until an authoritative refresh', async () => {
  const released = {
    ...work,
    assessmentMode: 'graded' as const,
    feedbackTiming: 'on_submission' as const,
    solutionAccess: 'instructor_release' as const,
    answersRevealedAt: null,
  };
  const final = {
    ...saved,
    submittedAt: '2026-11-01T12:00:00.000Z',
    gradePending: true,
    result: null,
  };
  vi.mocked(api.readAssignedWork).mockResolvedValue({ assignment: released, attempt: final });
  const user = await open();
  expect(
    screen.getByRole('heading', { name: 'Submitted — awaiting grade release' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Show assigned solution' })).not.toBeInTheDocument();
  expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument();
  vi.mocked(api.readAssignedWork).mockResolvedValue({
    assignment: { ...released, answersRevealedAt: '2026-11-02T12:00:00.000Z' },
    attempt: final,
  });
  await user.click(screen.getByRole('button', { name: 'Refresh results and answer access' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Show assigned solution' })).toBeInTheDocument(),
  );
  expect(
    screen.getByRole('heading', { name: 'Submitted — awaiting grade release' }),
  ).toBeInTheDocument();
  expect(api.submitAssignedWork).not.toHaveBeenCalled();
});
