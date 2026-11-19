import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { checkTruthTree } from '@logiclab/logic-engine/truth-tree';
import type { SavedStudentAttempt } from '@logiclab/contracts/saved-student-work';
import { installDialogStub, renderWithUnsavedWork as render } from '../../../../test/unsaved-work';
import { truthTreeWork, truthTreeSolution } from '../../../../test/truth-tree-work-fixture';
import { work, itemB, saved } from '../../../../test/assignment-work-fixture';
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
const treeItem = truthTreeWork.items[1]!;
let retained: SavedStudentAttempt | null;
beforeEach(() => {
  vi.resetAllMocks();
  retained = null;
  vi.mocked(api.readAssignedWork).mockImplementation(async () => ({
    assignment: { ...truthTreeWork, items: [treeItem] },
    attempt: retained,
  }));
  vi.mocked(api.saveAssignedAnswers).mockImplementation(async (_id, input) => {
    retained = {
      ...saved,
      revision: input.revision + 1,
      answers: { ...retained?.answers, [input.itemId]: input.answers },
    };
    return retained;
  });
  vi.mocked(api.checkAssignedAnswers).mockImplementation(async (_id, input) => {
    if (
      Array.isArray(input.answers) ||
      input.answers.type !== 'truth_tree' ||
      !('content' in treeItem) ||
      treeItem.content.type !== 'truth_tree'
    )
      throw new Error('Expected truth-tree request');
    return {
      itemId: input.itemId,
      feedback: {
        type: 'truth_tree',
        report: checkTruthTree({
          problem: {
            ruleCatalogVersion: 1,
            premises: treeItem.content.premises,
            conclusion: treeItem.content.conclusion,
          },
          tree: input.answers.tree,
        }),
      },
    };
  });
  vi.mocked(api.readAssignedSolution).mockResolvedValue(truthTreeSolution);
});
async function open() {
  const user = userEvent.setup();
  render(<AssignedAttempt assignmentId={work.id} />);
  await screen.findByRole('heading', { name: 'Problem 2: Truth-tree occurrence' });
  return user;
}

test('starts, explicitly checks and saves current work, retains failed edits and keeps reference reveal independent', async () => {
  const user = await open();
  await user.click(screen.getByRole('button', { name: 'Start tree' }));
  expect(screen.getByRole('button', { name: 'Save problem' })).toBeEnabled();
  expect(api.saveAssignedAnswers).not.toHaveBeenCalled();
  expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Check tree' }));
  expect(await screen.findByRole('region', { name: 'Truth-tree feedback' })).toHaveTextContent(
    'Argument: invalid',
  );
  vi.mocked(api.saveAssignedAnswers).mockRejectedValueOnce(new Error('Save unavailable'));
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save unavailable');
  expect(screen.getByRole('button', { name: 'Save problem' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  await screen.findByText('Problem 2 saved.');
  expect(screen.getByRole('button', { name: 'Save problem' })).toBeDisabled();
  expect(screen.queryByText('PRIVATE_REFERENCE_EXPLANATION')).not.toBeInTheDocument();
  const studentTree = structuredClone(retained!.answers[itemB]);
  await user.click(screen.getByRole('button', { name: 'Show assigned solution' }));
  expect(await screen.findByText('PRIVATE_REFERENCE_EXPLANATION')).toBeInTheDocument();
  expect(retained!.answers[itemB]).toEqual(studentTree);
  await user.click(screen.getByRole('button', { name: 'Hide assigned solution' }));
  const option = screen.getByLabelText('Witness 1').querySelectorAll('option')[1]!;
  await user.selectOptions(screen.getByLabelText('Witness 1'), option.value);
  expect(screen.getByRole('button', { name: 'Save problem' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Check tree' })).toBeDisabled();
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Reload saved work/ }));
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByLabelText('Witness 1')).toHaveValue(option.value);
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toBeInTheDocument();
});

test('completion-only filled but incorrect closure is saved before finalization and receives score-free retained diagnostics', async () => {
  vi.mocked(api.readAssignedWork).mockImplementation(async () => ({
    assignment: {
      ...truthTreeWork,
      items: [treeItem],
      assessmentMode: 'completion_only',
      feedbackTiming: 'on_submission',
      solutionAccess: 'never',
    },
    attempt: retained,
  }));
  vi.mocked(api.submitAssignedWork).mockImplementation(async () => {
    const answer = retained!.answers[itemB];
    if (
      !answer ||
      Array.isArray(answer) ||
      answer.type !== 'truth_tree' ||
      !('content' in treeItem) ||
      treeItem.content.type !== 'truth_tree'
    )
      throw new Error('Expected tree');
    const report = checkTruthTree({
      problem: {
        ruleCatalogVersion: 1,
        premises: treeItem.content.premises,
        conclusion: treeItem.content.conclusion,
      },
      tree: answer.tree,
    });
    return {
      ...retained!,
      revision: retained!.revision + 1,
      submittedAt: '2026-11-19T12:00:00.000Z',
      result: {
        gradingVersion: 'proof_completion_v1',
        items: [
          {
            evaluationVersion: 'truth_tree_v1',
            type: 'truth_tree',
            itemId: itemB,
            problemVersionId: work.id,
            report,
            completedResponses: 1,
            totalResponses: 1,
          },
        ],
        summary: {
          completedResponses: 1,
          totalResponses: 1,
          proofVerification: { verified: 0, errorsFound: 1, unavailable: 0, total: 1 },
        },
      },
    };
  });
  const user = await open();
  expect(screen.getByRole('button', { name: 'Submit final answers' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Start tree' }));
  await user.selectOptions(screen.getByLabelText('Closure type'), 'falsity');
  await user.selectOptions(
    screen.getByLabelText('Witness 1'),
    screen.getByLabelText('Witness 1').querySelectorAll('option')[1]!.value,
  );
  await user.click(screen.getByRole('button', { name: 'Close branch' }));
  expect(screen.queryByRole('button', { name: 'Check tree' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Submit final answers' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Save problem' }));
  await screen.findByText('Problem 2 saved.');
  await user.click(screen.getByLabelText('I understand submission is final and cannot be edited.'));
  await user.click(screen.getByRole('button', { name: 'Submit final answers' }));
  expect(await screen.findByRole('region', { name: 'Truth-tree feedback' })).toHaveTextContent(
    'Tree check: invalid',
  );
  expect(screen.getByText(/1 with errors found/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save problem' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start tree over' })).not.toBeInTheDocument();
  expect(api.checkAssignedAnswers).not.toHaveBeenCalled();
  expect(api.readAssignedSolution).not.toHaveBeenCalled();
});
