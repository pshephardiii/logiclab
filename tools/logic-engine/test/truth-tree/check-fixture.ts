import type { TruthTreeCheckInput, TruthTreeBranch } from '@logiclab/contracts/truth-tree';
import {
  parseTruthTreeFormula,
  decomposeTruthTreeFormula,
  areTruthTreeComplements,
  type TruthTreeFormula,
} from '../../src/truth-tree';
import { id } from './structure-fixture';

function text(formula: TruthTreeFormula): string {
  switch (formula.type) {
    case 'variable':
      return formula.name;
    case 'bottom':
      return '⊥';
    case 'not':
      return `!(${text(formula.operand)})`;
    case 'binary':
      return `(${text(formula.left)} ${{ and: '&', or: 'v', implies: '->', iff: '<->' }[formula.operator]} ${text(formula.right)})`;
  }
}

export function initialTree(premises: string[], conclusion: string): TruthTreeCheckInput {
  const initial = [
    ...premises.map((formula, index) => ({
      id: id(index + 2),
      formula,
      origin: { kind: 'premise' as const, premiseId: id(1000 + index) },
    })),
    {
      id: id(premises.length + 2),
      formula: `!(${conclusion})`,
      origin: { kind: 'negated_conclusion' as const },
    },
  ];
  return {
    problem: {
      ruleCatalogVersion: 1,
      premises: premises.map((formula, index) => ({ id: id(1000 + index), formula })),
      conclusion,
    },
    tree: {
      treeVersion: 1,
      format: 'truth_tree',
      rootBranchId: id(1),
      occurrences: initial,
      branches: [
        {
          id: id(1),
          parentId: null,
          occurrenceIds: initial.map((entry) => entry.id),
          ending: { kind: 'open' },
        },
      ],
      expansions: [],
    },
  };
}

/** Test construction helper, not a production solver. Oracle assertions use direct truth values. */
export function treeBuilder(input: TruthTreeCheckInput) {
  let next = 100;
  const fresh = () => id(next++);
  function expand(branch: TruthTreeBranch, sourceId: string) {
    const source = input.tree.occurrences.find((entry) => entry.id === sourceId)!;
    const decomposition = decomposeTruthTreeFormula(parseTruthTreeFormula(source.formula));
    if (decomposition.kind !== 'expansion') throw Error('Fixture needs a compound source.');
    const expansionId = fresh();
    const children: TruthTreeBranch[] =
      decomposition.branches.length === 1
        ? [branch]
        : decomposition.branches.map(() => ({
            id: fresh(),
            parentId: branch.id,
            occurrenceIds: [],
            ending: { kind: 'open' },
          }));
    if (children[0] !== branch) {
      input.tree.branches.push(...children);
      branch.ending = {
        kind: 'split',
        expansionId,
        childBranchIds: children.map((child) => child.id),
      };
    }
    const resultGroups = decomposition.branches.map((formulas, index) => {
      const child = children[index]!;
      const occurrenceIds = formulas.map((formula) => {
        const occurrenceId = fresh();
        input.tree.occurrences.push({
          id: occurrenceId,
          formula: text(formula),
          origin: { kind: 'expansion', expansionId },
        });
        child.occurrenceIds.push(occurrenceId);
        return occurrenceId;
      });
      return { branchId: child.id, occurrenceIds };
    });
    input.tree.expansions.push({
      id: expansionId,
      branchId: branch.id,
      sourceId,
      ruleId: decomposition.ruleId,
      resultGroups,
    });
    return children;
  }
  return { expand };
}

export function completeTree(premises: string[], conclusion: string): TruthTreeCheckInput {
  const input = initialTree(premises, conclusion);
  const builder = treeBuilder(input);
  const pending = [
    { branch: input.tree.branches[0]!, ancestors: [] as string[], expanded: new Set<string>() },
  ];
  while (pending.length) {
    const { branch, ancestors, expanded } = pending.pop()!;
    const path = [...ancestors, ...branch.occurrenceIds];
    const formulas = path.map((occurrenceId) =>
      parseTruthTreeFormula(
        input.tree.occurrences.find((entry) => entry.id === occurrenceId)!.formula,
      ),
    );
    const bottom = formulas.findIndex((formula) => formula.type === 'bottom');
    if (bottom >= 0) {
      branch.ending = { kind: 'closed', closure: { kind: 'falsity', occurrenceId: path[bottom]! } };
      continue;
    }
    let pair: [string, string] | null = null;
    for (let a = 0; a < path.length; a++)
      for (let b = a + 1; b < path.length; b++) {
        if (areTruthTreeComplements(formulas[a]!, formulas[b]!)) pair = [path[a]!, path[b]!];
      }
    if (pair) {
      branch.ending = { kind: 'closed', closure: { kind: 'complement', occurrenceIds: pair } };
      continue;
    }
    const source = path.find(
      (occurrenceId, index) =>
        !expanded.has(occurrenceId) &&
        decomposeTruthTreeFormula(formulas[index]!).kind === 'expansion',
    );
    if (!source) continue;
    expanded.add(source);
    const children = builder.expand(branch, source);
    for (const child of children)
      pending.push({
        branch: child,
        ancestors: child === branch ? ancestors : path,
        expanded: new Set(expanded),
      });
  }
  return input;
}
