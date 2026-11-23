import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { installDialogStub } from '../../../../test/unsaved-work';
import { truthTreeDraft, truthTreeDefinition } from '../../../../test/truth-tree';
import type {
  LibraryProblemDraft,
  CreateLibraryProblemRequest,
} from '@logiclab/contracts/problem-library';
import { checkTruthTree } from '@logiclab/logic-engine/truth-tree';
import { initialTruthTree } from '../../../features/truth-tree/helpers/construction';
import { ProblemForm } from './ProblemForm';

installDialogStub();
function setup(problem: LibraryProblemDraft | null = null) {
  const props = {
    problem,
    busy: false,
    onDirty: vi.fn(),
    onPreview: vi.fn(),
    onSave: vi
      .fn<(value: CreateLibraryProblemRequest) => Promise<boolean>>()
      .mockResolvedValue(false),
  };
  const view = render(<ProblemForm {...props} />);
  return { ...props, ...view, user: userEvent.setup() };
}

async function start() {
  const f = setup();
  await f.user.type(screen.getByLabelText('Title'), 'Reference argument');
  await f.user.selectOptions(screen.getByLabelText('Problem type'), 'truth_tree');
  await f.user.type(screen.getByLabelText('New premise'), 'P');
  await f.user.click(screen.getByRole('button', { name: 'Add premise' }));
  await f.user.type(screen.getByLabelText('Conclusion'), 'P');
  await f.user.click(screen.getByRole('button', { name: 'Continue to reference tree' }));
  return f;
}

test('authors an unfinished truth-tree draft, retains fields across type changes and never fabricates a reference', async () => {
  const f = setup();
  await f.user.type(screen.getByLabelText('Title'), 'Tree');
  await f.user.selectOptions(screen.getByLabelText('Problem type'), 'truth_tree');
  await f.user.type(screen.getByLabelText('Conclusion'), 'P &');
  await f.user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(f.onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({
      definition: expect.objectContaining({
        type: 'truth_tree',
        conclusion: 'P ∧',
        referenceTree: null,
      }),
    }),
  );
  await f.user.selectOptions(screen.getByLabelText('Problem type'), 'truth_table');
  await f.user.selectOptions(screen.getByLabelText('Problem type'), 'truth_tree');
  expect(screen.getByLabelText('Conclusion')).toHaveValue('P ∧');
  await f.user.click(screen.getByRole('button', { name: 'Continue to reference tree' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Conclusion:');
  expect(screen.queryByRole('group', { name: 'Tree construction' })).not.toBeInTheDocument();
});

test('seeds exactly the given sources, explicitly closes a reference and saves without publication authority', async () => {
  const f = await start();
  const display = screen.getByRole('region', { name: 'Truth tree' });
  expect(within(display).getAllByRole('listitem')).toHaveLength(2);
  expect(display).not.toHaveTextContent('(blank)');
  await f.user.click(screen.getByRole('button', { name: 'Close branch 1' }));
  await f.user.selectOptions(
    screen.getByLabelText('Witness 1'),
    [...screen.getByLabelText('Witness 1').querySelectorAll('option')][1]!.value,
  );
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '2. Reference tree' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Check current tree' })).toBeDisabled();
  await f.user.selectOptions(
    screen.getByLabelText('Witness 2'),
    [...screen.getByLabelText('Witness 2').querySelectorAll('option')][2]!.value,
  );
  await f.user.click(screen.getByRole('button', { name: 'Close branch' }));
  await f.user.click(screen.getByRole('button', { name: 'Check current tree' }));
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toHaveTextContent(
    'Tree check: verified. Argument: valid.',
  );
  await f.user.click(screen.getByRole('button', { name: 'Save draft' }));
  const input = f.onSave.mock.calls[0]![0];
  if (input.definition.type !== 'truth_tree') throw new Error('Expected tree');
  expect(input.definition.referenceTree!.occurrences).toHaveLength(2);
  expect(
    checkTruthTree({
      problem: {
        ruleCatalogVersion: input.definition.ruleCatalogVersion,
        formulaGroupingVersion: input.definition.formulaGroupingVersion,
        premises: input.definition.premises,
        conclusion: input.definition.conclusion,
      },
      tree: input.definition.referenceTree!,
    }).status,
  ).toBe('verified');
  expect(f.onDirty).toHaveBeenLastCalledWith(true);
  f.rerender(<ProblemForm {...f} saveError="Save unavailable" />);
  expect(screen.getByRole('alert')).toHaveTextContent('Save unavailable');
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toBeInTheDocument();
  await f.user.click(screen.getByRole('button', { name: 'Reopen branch 1' }));
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
});

test('statement changes preserve the private reference until a confirmed rebuild, with no phantom premise', async () => {
  const referenceTree = initialTruthTree(truthTreeDefinition);
  const f = setup({ ...truthTreeDraft, definition: { ...truthTreeDefinition, referenceTree } });
  await f.user.clear(screen.getByLabelText('Conclusion'));
  await f.user.type(screen.getByLabelText('Conclusion'), 'R');
  await f.user.click(screen.getByRole('button', { name: 'Continue to reference tree' }));
  expect(screen.getByText(/reference starts from a different statement/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add step to branch 1' })).toBeDisabled();
  await f.user.click(screen.getByRole('button', { name: 'Rebuild reference tree' }));
  await f.user.click(screen.getByRole('button', { name: 'Keep reference' }));
  await f.user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(f.onSave.mock.calls[0]![0].definition).toMatchObject({ conclusion: 'R', referenceTree });
  await f.user.click(screen.getByRole('button', { name: 'Rebuild reference tree' }));
  await f.user.click(screen.getByRole('button', { name: 'Rebuild reference' }));
  expect(screen.queryByText(/reference starts from a different statement/)).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Truth tree' })).toHaveTextContent('¬R');
  await f.user.click(screen.getByRole('button', { name: 'Save draft' }));
  const definition = f.onSave.mock.calls.at(-1)![0].definition;
  if (definition.type !== 'truth_tree') throw new Error('Expected tree');
  expect(definition.referenceTree!.occurrences).toHaveLength(2);
  expect(definition.referenceTree!.rootBranchId).not.toBe(referenceTree.rootBranchId);
  expect(definition.premises).toEqual(truthTreeDefinition.premises);
});

test('unconfirmed expansion is dirty, blocks save and survives without becoming a hidden draft field', async () => {
  const f = await start();
  await f.user.click(screen.getByRole('button', { name: 'Add step to branch 1' }));
  await f.user.selectOptions(screen.getByLabelText('Decomposition rule'), 'conjunction');
  await f.user.type(screen.getByLabelText('Formula 1 · Result 1.1'), 'P');
  expect(screen.getByRole('button', { name: 'Add expansion' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(f.onDirty).toHaveBeenLastCalledWith(true);
  await f.user.click(screen.getByRole('button', { name: 'Discard entry' }));
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  await f.user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(f.onSave.mock.calls[0]![0].definition).toMatchObject({
    referenceTree: { expansions: [], occurrences: expect.any(Array) },
  });
});

test('archived/busy drafts cannot change tree data and pristine trees register no dirty work', async () => {
  const problem = {
    ...truthTreeDraft,
    archivedAt: truthTreeDraft.updatedAt,
    definition: { ...truthTreeDefinition, referenceTree: initialTruthTree(truthTreeDefinition) },
  };
  const f = setup(problem);
  expect(screen.getByLabelText('Title')).toBeDisabled();
  expect(screen.getByLabelText('Conclusion')).toBeDisabled();
  await f.user.click(screen.getByRole('button', { name: '2. Reference tree' }));
  expect(screen.getByRole('button', { name: 'Rebuild reference tree' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Add step to branch 1' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Check current tree' })).toBeDisabled();
  expect(f.onSave).not.toHaveBeenCalled();
  await waitFor(() => expect(f.onDirty).toHaveBeenLastCalledWith(false));
});

test('truth-tree statement saves pin grouping and retain rejected mixed input', async () => {
  const f = setup();
  await f.user.type(screen.getByLabelText('Title'), 'Grouped tree');
  await f.user.selectOptions(screen.getByLabelText('Problem type'), 'truth_tree');
  await f.user.type(screen.getByLabelText('Conclusion'), 'P v Q & R');
  await f.user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(f.onSave).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Add parentheses or square brackets');
  await f.user.clear(screen.getByLabelText('Conclusion'));
  await f.user.type(screen.getByLabelText('Conclusion'), 'P v (Q & R)');
  await f.user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(f.onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      definition: expect.objectContaining({ formulaGroupingVersion: 1, conclusion: 'P ∨ (Q ∧ R)' }),
    }),
  );
});
