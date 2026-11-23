import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { TruthTreeContent } from '@logiclab/contracts/truth-tree-authoring';
import { checkTruthTree } from '@logiclab/logic-engine/truth-tree';
import { initialTruthTree, appendTruthTreeExpansion } from '../helpers/construction';
import { TruthTreeEditor } from './TruthTreeEditor';
import { installDialogStub } from '../../../../test/unsaved-work';

installDialogStub();

function statement(formula: string): TruthTreeContent {
  return {
    type: 'truth_tree',
    definitionVersion: 1,
    checkerVersion: 1,
    ruleCatalogVersion: 2,
    formulaGroupingVersion: 1,
    premises: [{ id: crypto.randomUUID(), formula }],
    conclusion: 'S',
  };
}

function setup(content: TruthTreeContent, initial = initialTruthTree(content)) {
  const changed = vi.fn();
  const pending = vi.fn();
  function Controlled() {
    const [tree, setTree] = useState(initial);
    return (
      <TruthTreeEditor
        tree={tree}
        statement={content}
        onPendingChange={pending}
        onChange={(next) => {
          changed(next);
          setTree(next);
        }}
      />
    );
  }
  render(<Controlled />);
  return { user: userEvent.setup(), changed, pending, initial };
}

test('extraction requires an explicit position and entered result; partial use and undo remain visible', async () => {
  const content = statement('P & Q & R');
  const f = setup(content);
  await f.user.click(screen.getByRole('button', { name: 'Add step to branch 1' }));
  await f.user.selectOptions(screen.getByLabelText('Source formula'), f.initial.occurrences[0]!.id);
  await f.user.selectOptions(screen.getByLabelText('Decomposition rule'), 'conjunct_extraction');
  await f.user.type(screen.getByLabelText('Formula 1 · Result 1.1'), 'P');
  expect(screen.getByRole('button', { name: 'Add expansion' })).toBeDisabled();
  await f.user.selectOptions(screen.getByLabelText('Conjunct to extract'), '0');
  await f.user.click(screen.getByRole('button', { name: 'Add expansion' }));
  const tree = f.changed.mock.calls.at(-1)![0] as typeof f.initial;
  expect(tree.expansions[0]!.chainChoice).toEqual({
    ruleId: 'conjunct_extraction',
    memberIndex: 0,
  });
  expect(tree.occurrences).toHaveLength(3); // No copied conjunction remainder.
  expect(screen.getByRole('img', { name: 'Components or paths remain' })).toBeInTheDocument();
  expect(
    checkTruthTree({
      problem: {
        ruleCatalogVersion: 2,
        formulaGroupingVersion: 1,
        premises: content.premises,
        conclusion: content.conclusion,
      },
      tree,
    }).status,
  ).toBe('incomplete');
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
  await f.user.click(screen.getByRole('button', { name: 'Undo last expansion' }));
  await f.user.click(screen.getByRole('button', { name: 'Undo expansion' }));
  expect(f.changed).toHaveBeenLastCalledWith(f.initial);
});

test('an ordered disjunction cut stays pending until confirmed and changing source resets the choice', async () => {
  const content = statement('P v Q v R');
  const f = setup(content);
  await f.user.click(screen.getByRole('button', { name: 'Add step to branch 1' }));
  await f.user.selectOptions(screen.getByLabelText('Source formula'), f.initial.occurrences[0]!.id);
  await f.user.selectOptions(screen.getByLabelText('Decomposition rule'), 'disjunction');
  const selector = screen.getByLabelText('Split between disjuncts');
  expect(
    within(selector)
      .getAllByRole('option')
      .map((option) => option.textContent),
  ).toEqual(['Choose split', 'P │ Q ∨ R', 'P ∨ Q │ R']);
  await f.user.selectOptions(selector, '2');
  expect(screen.getByLabelText('Formula 1 · Result 1.1')).toHaveValue('');
  await f.user.selectOptions(screen.getByLabelText('Source formula'), f.initial.occurrences[1]!.id);
  expect(selector).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Add expansion' })).toBeDisabled();
  await f.user.selectOptions(screen.getByLabelText('Source formula'), f.initial.occurrences[0]!.id);
  await f.user.selectOptions(selector, '2');
  await f.user.type(screen.getByLabelText('Formula 1 · Result 1.1'), 'P v Q');
  await f.user.type(screen.getByLabelText('Formula 1 · Result 2.1'), 'R');
  expect(f.changed).not.toHaveBeenCalled();
  expect(f.pending).toHaveBeenLastCalledWith(true);
  await f.user.click(screen.getByRole('button', { name: 'Add expansion' }));
  const tree = f.changed.mock.calls.at(-1)![0] as typeof f.initial;
  expect(tree.expansions[0]!.chainChoice).toEqual({ ruleId: 'disjunction', splitIndex: 2 });
  expect(tree.branches).toHaveLength(3);
  expect(screen.queryByRole('region', { name: 'Truth-tree feedback' })).not.toBeInTheDocument();
});

test('derived source choices retain inherited groups even when entered text omits them', async () => {
  const content = statement('!!((P & Q) & R)');
  const initial = initialTruthTree(content);
  const tree = appendTruthTreeExpansion(
    initial,
    initial.rootBranchId!,
    initial.occurrences[0]!.id,
    'double_negation',
    [['P & Q & R']],
  );
  const f = setup(content, tree);
  await f.user.click(screen.getByRole('button', { name: 'Add step to branch 1' }));
  await f.user.selectOptions(screen.getByLabelText('Source formula'), tree.occurrences[2]!.id);
  await f.user.selectOptions(screen.getByLabelText('Decomposition rule'), 'conjunct_extraction');
  expect(
    within(screen.getByLabelText('Conjunct to extract'))
      .getAllByRole('option')
      .map((option) => option.textContent),
  ).toEqual(['Choose conjunct', '1. (P ∧ Q)', '2. R']);
  expect(screen.getByLabelText('Formula 3')).toHaveValue('P ∧ Q ∧ R');
  expect(f.changed).not.toHaveBeenCalled();
});
