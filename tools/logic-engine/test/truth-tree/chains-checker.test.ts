import {
  checkTruthTree,
  isFinishedTruthTreeAttempt,
  checkTruthTreeSteps,
} from '../../src/truth-tree';
import {
  truthTreeCheckReportSchema,
  truthTreeSchema,
  type TruthTreeCheckInput,
  type TruthTreeChainChoice,
} from '@logiclab/contracts/truth-tree';
import { initialTree } from './check-fixture';
import { id } from './structure-fixture';

function fixture(premises: string[], conclusion: string) {
  const input = initialTree(premises, conclusion);
  input.problem.ruleCatalogVersion = 2;
  input.problem.formulaGroupingVersion = 1;
  input.tree.treeVersion = 2;
  let next = 200;
  const fresh = () => id(next++);
  function add(
    branchId: string,
    sourceId: string,
    ruleId: string,
    formulas: string[][],
    chainChoice?: TruthTreeChainChoice,
  ) {
    const branch = input.tree.branches.find((item) => item.id === branchId)!;
    const expansionId = fresh();
    const groups = formulas.map((group) => {
      const destination =
        formulas.length === 2
          ? {
              id: fresh(),
              parentId: branchId,
              occurrenceIds: [] as string[],
              ending: { kind: 'open' as const },
            }
          : branch;
      const occurrences = group.map((formula) => ({
        id: fresh(),
        formula,
        origin: { kind: 'expansion' as const, expansionId },
      }));
      input.tree.occurrences.push(...occurrences);
      destination.occurrenceIds.push(...occurrences.map((item) => item.id));
      if (destination !== branch) input.tree.branches.push(destination);
      return { branchId: destination.id, occurrenceIds: occurrences.map((item) => item.id) };
    });
    if (groups.length === 2)
      branch.ending = {
        kind: 'split',
        expansionId,
        childBranchIds: groups.map((group) => group.branchId),
      };
    input.tree.expansions.push({
      id: expansionId,
      branchId,
      sourceId,
      ruleId,
      resultGroups: groups,
      ...(chainChoice ? { chainChoice } : {}),
    });
    return groups;
  }
  function extract(branchId: string, sourceId: string, memberIndex: number, formula: string) {
    return add(branchId, sourceId, 'conjunct_extraction', [[formula]], {
      ruleId: 'conjunct_extraction',
      memberIndex,
    })[0]!.occurrenceIds[0]!;
  }
  function split(branchId: string, sourceId: string, splitIndex: number, formulas: string[]) {
    return add(
      branchId,
      sourceId,
      'disjunction',
      formulas.map((formula) => [formula]),
      { ruleId: 'disjunction', splitIndex },
    );
  }
  function close(branchId: string, first: string, second: string) {
    input.tree.branches.find((branch) => branch.id === branchId)!.ending = {
      kind: 'closed',
      closure: { kind: 'complement', occurrenceIds: [first, second] },
    };
  }
  const root = input.tree.rootBranchId!;
  return { input, root, add, extract, split, close };
}
function checked(input: TruthTreeCheckInput) {
  const before = structuredClone(input);
  const report = checkTruthTree(input);
  expect(truthTreeCheckReportSchema.safeParse(report).success).toBe(true);
  expect(input).toEqual(before);
  return report;
}

test('partial and repeated conjunct extraction cannot complete an open path', () => {
  const f = fixture(['P & Q & R'], 'S'),
    source = f.input.tree.occurrences[0]!.id;
  f.extract(f.root, source, 0, 'P');
  expect(checked(f.input)).toMatchObject({
    ruleCatalogVersion: 2,
    status: 'incomplete',
    steps: { status: 'checked' },
    branches: [{ status: 'incomplete', unexpandedOccurrenceIds: [source] }],
  });
  expect(isFinishedTruthTreeAttempt(f.input)).toBe(false);
  f.extract(f.root, source, 0, 'P');
  expect(checked(f.input).status).toBe('incomplete');
  f.extract(f.root, source, 1, 'Q');
  f.extract(f.root, source, 2, 'R');
  expect(checked(f.input)).toMatchObject({
    status: 'verified',
    argumentStatus: 'invalid',
    counterexample: { assignment: { P: true, Q: true, R: true, S: false } },
  });
  expect(isFinishedTruthTreeAttempt(f.input)).toBe(true);
});

test('a branch can close after one extracted conjunct without copying unused remainders', () => {
  const f = fixture(['P & Q & R'], 'P'),
    source = f.input.tree.occurrences[0]!.id;
  const p = f.extract(f.root, source, 0, 'P');
  f.close(f.root, f.input.tree.occurrences[1]!.id, p);
  expect(checked(f.input)).toMatchObject({ status: 'verified', argumentStatus: 'valid' });
  expect(isFinishedTruthTreeAttempt(f.input)).toBe(true);
  expect(f.input.tree.expansions).toHaveLength(1);
});

test('component inheritance is copied per child and cannot combine sibling work', () => {
  const f = fixture(['P & Q & R', 'S v T'], 'U');
  const source = f.input.tree.occurrences[0]!.id;
  f.extract(f.root, source, 0, 'P');
  const [left, right] = f.split(f.root, f.input.tree.occurrences[1]!.id, 1, ['S', 'T']);
  f.extract(left!.branchId, source, 1, 'Q');
  f.extract(right!.branchId, source, 2, 'R');
  expect(checked(f.input).branches.every((branch) => branch.status === 'incomplete')).toBe(true);
  expect(isFinishedTruthTreeAttempt(f.input)).toBe(false);
  f.extract(left!.branchId, source, 2, 'R');
  const partial = checked(f.input);
  expect(partial.status).toBe('verified');
  expect(partial.branches.find((branch) => branch.branchId === right!.branchId)).toMatchObject({
    status: 'incomplete',
    unexpandedOccurrenceIds: [source],
  });
  expect(isFinishedTruthTreeAttempt(f.input)).toBe(false);
  f.extract(right!.branchId, source, 1, 'Q');
  expect(checked(f.input).branches.every((branch) => branch.status === 'open_complete')).toBe(true);
  expect(isFinishedTruthTreeAttempt(f.input)).toBe(true);
});

test('duplicate conjunct positions must each be accounted for on an open path', () => {
  const f = fixture(['P & P & Q'], 'R'),
    source = f.input.tree.occurrences[0]!.id;
  f.extract(f.root, source, 0, 'P');
  f.extract(f.root, source, 2, 'Q');
  expect(checked(f.input).status).toBe('incomplete');
  f.extract(f.root, source, 1, 'P');
  expect(checked(f.input).status).toBe('verified');
});

test.each([1, 2, 3])(
  'full checking accepts disjunction cut %s while retaining remaining compound obligations',
  (cut) => {
    const f = fixture(['P v Q v R v S'], 'T');
    const members = ['P', 'Q', 'R', 'S'];
    f.split(f.root, f.input.tree.occurrences[0]!.id, cut, [
      members.slice(0, cut).join(' v '),
      members.slice(cut).join(' v '),
    ]);
    const report = checked(f.input);
    expect(report.steps).toMatchObject({ ruleCatalogVersion: 2, status: 'checked' });
    expect(report.status).toBe(cut === 2 ? 'incomplete' : 'verified');
    expect(report.branches.some((branch) => branch.status === 'incomplete')).toBe(true);
    expect(isFinishedTruthTreeAttempt(f.input)).toBe(false);
  },
);

test('removing original premise groups cannot unlock a forbidden extraction', () => {
  const f = fixture(['(P & Q) & R'], 'S');
  f.input.tree.occurrences[0]!.formula = 'P & Q & R';
  f.extract(f.root, f.input.tree.occurrences[0]!.id, 0, 'P');
  expect(checked(f.input)).toMatchObject({
    status: 'invalid',
    steps: {
      diagnostics: expect.arrayContaining([expect.objectContaining({ code: 'RULE_MISMATCH' })]),
    },
  });
});

test('normal binary rules also preserve inherited groups on later source occurrences', () => {
  const f = fixture(['((P v Q) v R) & S'], 'T');
  const source = f.add(f.root, f.input.tree.occurrences[0]!.id, 'conjunction', [
    ['P v Q v R', 'S'],
  ])[0]!.occurrenceIds[0]!;
  f.split(f.root, source, 1, ['P', 'Q v R']);
  expect(checked(f.input).status).toBe('invalid');
});

test('source processing is independent of transport array ordering', () => {
  const f = fixture(['P & Q & R'], 'S'),
    source = f.input.tree.occurrences[0]!.id;
  f.extract(f.root, source, 0, 'P');
  f.extract(f.root, source, 1, 'Q');
  f.extract(f.root, source, 2, 'R');
  const before = checked(f.input);
  f.input.tree.expansions.reverse();
  f.input.tree.occurrences.reverse();
  const after = checked(f.input);
  expect(after.status).toBe(before.status);
  expect(after.counterexample).toEqual(before.counterexample);
});

test('finished wrong values and closures remain score-free completion attempts with verification errors', () => {
  const f = fixture(['P & Q'], 'R'),
    source = f.input.tree.occurrences[0]!.id;
  f.extract(f.root, source, 0, 'S');
  f.extract(f.root, source, 1, 'Q');
  expect(checked(f.input).status).toBe('invalid');
  expect(isFinishedTruthTreeAttempt(f.input)).toBe(true);
  const closed = fixture(['P & Q'], 'P');
  const p = closed.extract(closed.root, closed.input.tree.occurrences[0]!.id, 0, 'P');
  closed.input.tree.branches[0]!.ending = {
    kind: 'closed',
    closure: { kind: 'falsity', occurrenceId: p },
  };
  expect(checked(closed.input).status).toBe('invalid');
  expect(isFinishedTruthTreeAttempt(closed.input)).toBe(true);
});

test('missing choices, missing alternatives and out-of-range member claims cannot certify completion', () => {
  const missing = fixture(['P & Q'], 'R');
  missing.add(missing.root, missing.input.tree.occurrences[0]!.id, 'conjunct_extraction', [['P']]);
  expect(checked(missing.input).status).toBe('incomplete');
  expect(isFinishedTruthTreeAttempt(missing.input)).toBe(false);
  const absent = fixture(['P v Q'], 'R');
  absent.add(absent.root, absent.input.tree.occurrences[0]!.id, 'disjunction', [['P']], {
    ruleId: 'disjunction',
    splitIndex: 1,
  });
  expect(checked(absent.input).status).toBe('invalid');
  expect(isFinishedTruthTreeAttempt(absent.input)).toBe(false);
  const foreign = fixture(['P & Q'], 'R');
  foreign.extract(foreign.root, foreign.input.tree.occurrences[0]!.id, 20, 'P');
  expect(checked(foreign.input).status).toBe('invalid');
  expect(isFinishedTruthTreeAttempt(foreign.input)).toBe(false);
});

test('catalog/tree mismatches, missing policy and forged report versions fail closed', () => {
  const f = fixture(['P & Q'], 'R');
  expect(
    checked({ ...f.input, problem: { ...f.input.problem, formulaGroupingVersion: undefined } })
      .status,
  ).toBe('unassessable');
  expect(checked({ ...f.input, tree: { ...f.input.tree, treeVersion: 1 } }).status).toBe(
    'unassessable',
  );
  expect(
    checked({ ...f.input, problem: { ...f.input.problem, ruleCatalogVersion: 1 } }).status,
  ).toBe('unassessable');
  const report = checked(f.input);
  expect(truthTreeCheckReportSchema.safeParse({ ...report, ruleCatalogVersion: 1 }).success).toBe(
    false,
  );
  const legacy = initialTree(['P & Q'], 'R');
  legacy.tree.expansions.push({
    id: id(300),
    branchId: legacy.tree.rootBranchId!,
    sourceId: legacy.tree.occurrences[0]!.id,
    ruleId: 'conjunct_extraction',
    chainChoice: { ruleId: 'conjunct_extraction', memberIndex: 0 },
    resultGroups: [],
  });
  expect(truthTreeSchema.safeParse(legacy.tree).success).toBe(false);
  expect(JSON.stringify(report)).not.toContain('authoritativeSources');
  expect(JSON.stringify(report)).not.toContain('derivedSources');
  expect(checkTruthTreeSteps(f.input).ruleCatalogVersion).toBe(2);
});

test('unused incorrect extraction still requires review even when a valid pair closes the branch', () => {
  const f = fixture(['P & Q'], 'P'),
    source = f.input.tree.occurrences[0]!.id;
  const p = f.extract(f.root, source, 0, 'P');
  f.extract(f.root, source, 1, 'R');
  f.close(f.root, f.input.tree.occurrences[1]!.id, p);
  expect(checked(f.input).status).toBe('invalid');
  expect(isFinishedTruthTreeAttempt(f.input)).toBe(true);
});

test('positive cuts follow graph child order even when result-group transport is reordered', () => {
  const f = fixture(['P v Q v R'], 'S');
  f.split(f.root, f.input.tree.occurrences[0]!.id, 1, ['P', 'Q v R']);
  f.input.tree.expansions[0]!.resultGroups.reverse();
  expect(checked(f.input).steps.status).toBe('checked');
});
