import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { installDialogStub, renderWithUnsavedWork as render } from '../../../../test/unsaved-work';
import { treeDerivationDefinition } from '../../../../test/derivation';
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
const { referenceProof, explanation, ...content } = treeDerivationDefinition;
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

test('tree edits retain work across failed saves, problem navigation and Stay without changing the assigned format', async () => {
  const user = await open();
  expect(screen.getByRole('region', { name: 'Tree student proof editor' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Proof format')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save problem' })).toBeDisabled();
  await user.type(screen.getByLabelText('Formula for node 1'), ' &');
  vi.mocked(api.saveAssignedAnswers).mockRejectedValueOnce(new Error('Save unavailable'));
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  await screen.findByText('Save unavailable');
  await user.click(screen.getByRole('button', { name: 'Next problem' }));
  await user.click(screen.getByRole('button', { name: 'Start proof' }));
  await user.click(screen.getByRole('button', { name: 'Previous problem' }));
  expect(screen.getByLabelText('Formula for node 1')).toHaveValue('P ∧');
  await user.click(
    screen.getByRole('button', { name: 'Reload saved work (discard unsaved edits)' }),
  );
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Formula for node 1')).toHaveValue('P ∧');
});

test('explicit saves preserve tree identities and establish the confirmed reload baseline', async () => {
  const user = await open();
  await user.type(screen.getByLabelText('Formula for node 1'), ' &');
  const edited = structuredClone(answer);
  edited.proof.nodes[0]!.formula = 'P ∧';
  const next = { ...saved, revision: saved.revision + 1, answers: { [itemA]: edited } };
  vi.mocked(api.saveAssignedAnswers).mockResolvedValue(next);
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  await screen.findByText('Problem 1 saved.');
  expect(api.saveAssignedAnswers).toHaveBeenCalledWith(
    work.id,
    { revision: saved.revision, itemId: itemA, answers: edited },
    expect.any(AbortSignal),
  );
  expect(screen.getByRole('button', { name: 'Save problem' })).toBeDisabled();
  const unloading = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unloading);
  expect(unloading.defaultPrevented).toBe(false);
  vi.mocked(api.readAssignedWork).mockResolvedValue({ assignment: work, attempt: next });
  await user.click(
    screen.getByRole('button', { name: 'Reload saved work (discard unsaved edits)' }),
  );
  await waitFor(() => expect(screen.getByLabelText('Formula for node 1')).toHaveValue('P ∧'));
  expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
});

test('checks and separately authorized references never save or replace the student tree', async () => {
  const user = await open();
  expect(screen.queryByText('PRIVATE_TREE_REFERENCE')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  await screen.findByText('Proof verified.');
  expect(screen.getByText('Node-by-node checks')).toBeInTheDocument();
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Show assigned solution' }));
  await screen.findByText('PRIVATE_TREE_REFERENCE');
  expect(screen.getByLabelText('Formula for node 1')).toHaveValue('P');
  await user.type(screen.getByLabelText('Formula for node 1'), ' &');
  expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument();
  expect(api.checkAssignedAnswers).toHaveBeenCalledTimes(1);
});

test('late tree check responses are cancelled and cannot annotate a changed snapshot', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof api.checkAssignedAnswers>>) => void;
  vi.mocked(api.checkAssignedAnswers).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const user = await open();
  await user.click(screen.getByRole('button', { name: 'Check proof' }));
  const signal = vi.mocked(api.checkAssignedAnswers).mock.calls[0]![2];
  await user.type(screen.getByLabelText('Formula for node 1'), ' &');
  expect(signal.aborted).toBe(true);
  resolve({ itemId: itemA, feedback: { type: 'derivation', report } });
  await waitFor(() => expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument());
});
