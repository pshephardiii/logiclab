import {
  truthTreeStepReportSchema,
  type TruthTree,
  type TruthTreeCheckInput,
} from '@logiclab/contracts/truth-tree';
import { checkTruthTreeSteps } from '../../src/truth-tree';
import { truthTreeBudget } from '../../src/truth-tree/structure-context';
import { id, ids } from './structure-fixture';

const cases: [string, string[][]][] = [
  ['!!P', [['P']]],
  ['P & Q', [['P', 'Q']]],
  ['!(P & Q)', [['!P'], ['!Q']]],
  ['P v Q', [['P'], ['Q']]],
  ['!(P v Q)', [['!P', '!Q']]],
  ['P -> Q', [['!P'], ['Q']]],
  ['!(P -> Q)', [['P', '!Q']]],
  [
    'P <-> Q',
    [
      ['P', 'Q'],
      ['!P', '!Q'],
    ],
  ],
  [
    '!(P <-> Q)',
    [
      ['P', '!Q'],
      ['!P', 'Q'],
    ],
  ],
];
const ruleIds = [
  'double_negation',
  'conjunction',
  'negated_conjunction',
  'disjunction',
  'negated_disjunction',
  'conditional',
  'negated_conditional',
  'biconditional',
  'negated_biconditional',
];

function fixture(
  source: string,
  outputs: string[][],
  ruleId = ruleIds[cases.findIndex((entry) => entry[0] === source)]!,
): TruthTreeCheckInput {
  const tree: TruthTree = {
    treeVersion: 1,
    format: 'truth_tree',
    rootBranchId: ids.root,
    occurrences: [
      { id: ids.premise, formula: source, origin: { kind: 'premise', premiseId: id(900) } },
      { id: ids.conclusion, formula: '!R', origin: { kind: 'negated_conclusion' } },
    ],
    branches: [
      {
        id: ids.root,
        parentId: null,
        occurrenceIds: [ids.premise, ids.conclusion],
        ending: { kind: 'open' },
      },
    ],
    expansions: [
      { id: ids.expansion, branchId: ids.root, sourceId: ids.premise, ruleId, resultGroups: [] },
    ],
  };
  for (const [branchIndex, formulas] of outputs.entries()) {
    const branchId = outputs.length === 1 ? ids.root : id(20 + branchIndex);
    if (outputs.length > 1)
      tree.branches.push({
        id: branchId,
        parentId: ids.root,
        occurrenceIds: [],
        ending: { kind: 'open' },
      });
    const occurrenceIds = formulas.map((formula, index) => {
      const occurrenceId = id(30 + branchIndex * 2 + index);
      tree.occurrences.push({
        id: occurrenceId,
        formula,
        origin: { kind: 'expansion', expansionId: ids.expansion },
      });
      return occurrenceId;
    });
    tree.branches.find((branch) => branch.id === branchId)!.occurrenceIds.push(...occurrenceIds);
    tree.expansions[0]!.resultGroups.push({ branchId, occurrenceIds });
  }
  if (outputs.length === 2)
    tree.branches[0]!.ending = {
      kind: 'split',
      expansionId: ids.expansion,
      childBranchIds: [id(20), id(21)],
    };
  return {
    problem: {
      ruleCatalogVersion: 1,
      premises: [{ id: id(900), formula: source }],
      conclusion: 'R',
    },
    tree,
  };
}

function check(input: unknown, status: 'checked' | 'invalid' | 'incomplete' | 'unassessable') {
  const result = checkTruthTreeSteps(input);
  expect(result.status).toBe(status);
  expect(truthTreeStepReportSchema.safeParse(result).success).toBe(true);
  expect(result).not.toHaveProperty('argumentStatus');
  return result;
}

test.each(cases)(
  'checks exact %s decomposition without deciding argument validity',
  (source, outputs) => {
    const input = fixture(source, outputs);
    const before = structuredClone(input);
    expect(check(input, 'checked').expansions).toEqual([
      { expansionId: ids.expansion, status: 'valid' },
    ]);
    expect(input).toEqual(before);
  },
);

test.each(cases)(
  'checks compound substitutions and free output ordering: %s',
  (source, outputs) => {
    const replace = (value: string) => value.replace(/P/g, '(P -> S)').replace(/Q/g, '(Q & S)');
    const input = fixture(
      replace(source),
      outputs.map((branch) => branch.map(replace)).reverse(),
      ruleIds[cases.findIndex((entry) => entry[0] === source)]!,
    );
    for (const group of input.tree.expansions[0]!.resultGroups) group.occurrenceIds.reverse();
    input.tree.occurrences.reverse();
    input.tree.branches.reverse();
    check(input, 'checked');
  },
);

test('repeated components need separate result occurrences, not set membership', () => {
  const input = fixture('P & P', [['P', 'P']], 'conjunction');
  check(input, 'checked');
  const removed = input.tree.expansions[0]!.resultGroups[0]!.occurrenceIds.pop()!;
  input.tree.occurrences = input.tree.occurrences.filter((entry) => entry.id !== removed);
  input.tree.branches[0]!.occurrenceIds = input.tree.branches[0]!.occurrenceIds.filter(
    (entry) => entry !== removed,
  );
  check(input, 'invalid');
});

test.each<[string, (input: TruthTreeCheckInput) => void]>([
  ['wrong alternative', (input) => (input.tree.occurrences[3]!.formula = 'P')],
  ['unknown rule', (input) => (input.tree.expansions[0]!.ruleId = 'made_up')],
  ['wrong rule', (input) => (input.tree.expansions[0]!.ruleId = 'conjunction')],
  ['changed authoritative premise', (input) => (input.problem.premises[0]!.formula = 'Q v P')],
  [
    'unknown premise identity',
    (input) => (input.tree.occurrences[0]!.origin = { kind: 'premise', premiseId: id(901) }),
  ],
  ['unnegated conclusion', (input) => (input.tree.occurrences[1]!.formula = 'R')],
  ['bad output syntax', (input) => (input.tree.occurrences[3]!.formula = 'Q &')],
])('%s cannot yield checked evidence', (_name, change) => {
  const input = fixture('P v Q', [['P'], ['Q']]);
  change(input);
  check(input, 'invalid');
});

test('local validity does not erase an initial mismatch', () => {
  const input = fixture('P v Q', [['P'], ['Q']]);
  input.problem.premises[0]!.formula = 'Q v P';
  const report = check(input, 'invalid');
  expect(report.initial).toBe('invalid');
  expect(report.expansions[0]!.status).toBe('valid');
});

test('blank output is incomplete, and dependent local checks remain unknown', () => {
  const input = fixture('!!P', [['P']]);
  input.tree.occurrences[2]!.formula = '';
  const report = check(input, 'incomplete');
  expect(report.expansions[0]!.status).toBe('unknown');
});

test('atomic formulas cannot be expanded by a compound rule', () => {
  check(fixture('P', [['P']], 'double_negation'), 'invalid');
});

test('the conclusion is explicitly negated without implicit double-negation rewriting', () => {
  const input = fixture('!!P', [['P']]);
  input.problem.conclusion = '!P';
  input.tree.occurrences[1]!.formula = '!!P';
  check(input, 'checked');
  input.tree.occurrences[1]!.formula = 'P';
  check(input, 'invalid');
});

test('a missing supplied premise cannot be hidden by a well-formed initial segment', () => {
  const input = fixture('!!P', [['P']]);
  input.problem.premises.push({ id: id(901), formula: 'Q' });
  check(input, 'incomplete');
});

test('branching biconditional results cannot omit their second formulas', () => {
  const input = fixture('P <-> Q', [['P'], ['!P']]);
  check(input, 'invalid');
});

test('initial premise order and identical-text distinct premise identities are preserved', () => {
  const input = fixture('!!P', [['P']]);
  input.problem.premises.push({ id: id(901), formula: '!!P' });
  input.tree.occurrences.push({
    id: id(902),
    formula: '~~P',
    origin: { kind: 'premise', premiseId: id(901) },
  });
  input.tree.branches[0]!.occurrenceIds.unshift(id(902));
  check(input, 'checked');
  input.tree.occurrences.at(-1)!.origin = { kind: 'premise', premiseId: id(900) };
  check(input, 'invalid');
});

test('missing initial formulas are incomplete; duplicate negated conclusions are invalid', () => {
  const input = fixture('!!P', [['P']]);
  input.tree.occurrences = input.tree.occurrences.filter((entry) => entry.id !== ids.conclusion);
  input.tree.branches[0]!.occurrenceIds = input.tree.branches[0]!.occurrenceIds.filter(
    (entry) => entry !== ids.conclusion,
  );
  check(input, 'incomplete');
  input.tree.occurrences.unshift(
    { id: ids.conclusion, formula: '!R', origin: { kind: 'negated_conclusion' } },
    { id: id(903), formula: '!R', origin: { kind: 'negated_conclusion' } },
  );
  input.tree.branches[0]!.occurrenceIds.unshift(ids.conclusion, id(903));
  check(input, 'invalid');
});

test.each(['P', 'P & Q', '!P', '⊥'])(
  'exact complementary formulas can close a branch: %s',
  (formula) => {
    const input = fixture('!!P', [['P']]);
    input.tree.expansions = [];
    input.tree.occurrences.splice(2);
    input.tree.branches[0]!.occurrenceIds.splice(2);
    input.problem.premises[0]!.formula = formula;
    input.problem.conclusion = formula;
    input.tree.occurrences[0]!.formula = formula;
    input.tree.occurrences[1]!.formula = `!(${formula})`;
    input.tree.branches[0]!.ending = {
      kind: 'closed',
      closure: { kind: 'complement', occurrenceIds: [ids.conclusion, ids.premise] },
    };
    expect(check(input, 'checked').closures[0]!.status).toBe('valid');
  },
);

test.each([
  ['⊥', 'checked'],
  ['!⊥', 'invalid'],
  ['F', 'invalid'],
] as const)('falsity closure for %s is %s', (formula, status) => {
  const input = fixture('!!P', [['P']]);
  input.tree.expansions = [];
  input.tree.occurrences.splice(2);
  input.tree.branches[0]!.occurrenceIds.splice(2);
  input.problem.premises[0]!.formula = formula;
  input.tree.occurrences[0]!.formula = formula;
  input.tree.branches[0]!.ending = {
    kind: 'closed',
    closure: { kind: 'falsity', occurrenceId: ids.premise },
  };
  check(input, status);
});

test('noncomplementary closure fails even when both witnesses are accessible', () => {
  const input = fixture('!!P', [['P']]);
  input.tree.branches[0]!.ending = {
    kind: 'closed',
    closure: { kind: 'complement', occurrenceIds: [ids.conclusion, id(30)] },
  };
  expect(check(input, 'invalid').closures[0]!.status).toBe('invalid');
});

test('a correct closure cannot hide an unused malformed occurrence', () => {
  const input = fixture('!!P', [['P']]);
  input.problem.conclusion = 'P';
  input.tree.occurrences[1]!.formula = '!P';
  input.tree.branches[0]!.ending = {
    kind: 'closed',
    closure: { kind: 'complement', occurrenceIds: [ids.conclusion, id(30)] },
  };
  input.tree.occurrences.push({
    id: id(40),
    formula: 'Q &',
    origin: { kind: 'expansion', expansionId: id(41) },
  });
  input.tree.branches[0]!.occurrenceIds.push(id(40));
  input.tree.expansions.push({
    id: id(41),
    branchId: ids.root,
    sourceId: ids.premise,
    ruleId: 'double_negation',
    resultGroups: [{ branchId: ids.root, occurrenceIds: [id(40)] }],
  });
  expect(check(input, 'invalid').closures[0]!.status).toBe('valid');
});

test.each([null, {}, { ...fixture('!!P', [['P']]), accepted: true }])(
  'malformed top-level input is unassessable: %#',
  (input) => {
    check(input, 'unassessable');
  },
);

test('bad authoritative syntax/identities and unsupported catalogs are unassessable', () => {
  const input = fixture('!!P', [['P']]);
  input.problem.conclusion = 'P &';
  check(input, 'unassessable');
  input.problem.conclusion = 'R';
  input.problem.premises.push(structuredClone(input.problem.premises[0]!));
  check(input, 'unassessable');
  check({ ...input, problem: { ...input.problem, ruleCatalogVersion: 2 } }, 'unassessable');
});

test('argument preflight and shared work limits return no partial certification', () => {
  const input = fixture('!!P', [['P']]);
  check(
    { ...input, problem: { ...input.problem, premises: Array(51).fill(null) } },
    'unassessable',
  );
  check({ ...input, problem: { ...input.problem, conclusion: 'P'.repeat(257) } }, 'unassessable');
  const budget = truthTreeBudget();
  budget.spend(100_000);
  const report = checkTruthTreeSteps(input, budget);
  expect(truthTreeStepReportSchema.safeParse(report).success).toBe(true);
  expect(report.status).toBe('unassessable');
  expect(report.occurrences).toEqual([]);
});

test('report contracts reject fabricated checked or partially certified failure reports', () => {
  const valid = check(fixture('!!P', [['P']]), 'checked');
  expect(truthTreeStepReportSchema.safeParse({ ...valid, initial: 'unknown' }).success).toBe(false);
  expect(truthTreeStepReportSchema.safeParse({ ...valid, occurrences: [] }).success).toBe(false);
  expect(truthTreeStepReportSchema.safeParse({ ...valid, argumentStatus: 'valid' }).success).toBe(
    false,
  );
  expect(
    truthTreeStepReportSchema.safeParse({
      ...valid,
      occurrences: [...valid.occurrences, valid.occurrences[0]],
    }).success,
  ).toBe(false);
  expect(
    truthTreeStepReportSchema.safeParse({
      ...valid,
      status: 'unassessable',
      diagnostics: [{ code: 'RESOURCE_LIMIT', message: 'Stopped.' }],
    }).success,
  ).toBe(false);
});
