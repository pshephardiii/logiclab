import {
  isFinishedTruthTreeAttempt,
  checkTruthTree,
  TRUTH_TREE_RULE_CATALOG,
  decomposeTruthTreeFormula,
  parseTruthTreeFormula,
} from '../../src/truth-tree';
import { completeTree, initialTree, treeBuilder } from './check-fixture';
import { id } from './structure-fixture';

test.each<[string[], string]>([
  [['P'], 'P'],
  [['P'], 'Q'],
  [['P v Q'], 'R'],
  [[], 'P v !P'],
  [[], '⊥'],
])(
  'fully entered valid/invalid argument attempts are finished: %j entails %s',
  (premises, conclusion) => {
    expect(isFinishedTruthTreeAttempt(completeTree(premises, conclusion))).toBe(true);
  },
);

test('finished completion is stricter than one verified counterexample when another path is unfinished', () => {
  const input = initialTree(['P v (Q & R)'], 'S');
  treeBuilder(input).expand(input.tree.branches[0]!, input.tree.occurrences[0]!.id);
  expect(checkTruthTree(input).argumentStatus).toBe('invalid');
  expect(isFinishedTruthTreeAttempt(input)).toBe(false);
});

test('a filled but incorrect closure can complete and retain verification errors', () => {
  const input = initialTree(['P'], 'Q');
  input.tree.branches[0]!.ending = {
    kind: 'closed',
    closure: {
      kind: 'complement',
      occurrenceIds: input.tree.branches[0]!.occurrenceIds as [string, string],
    },
  };
  expect(isFinishedTruthTreeAttempt(input)).toBe(true);
  expect(checkTruthTree(input).status).toBe('invalid');
});

test('wrong rule choice is finished when all fields of that selected rule are filled', () => {
  const input = completeTree(['P & Q'], 'R');
  input.tree.expansions[0]!.ruleId = 'negated_disjunction';
  expect(isFinishedTruthTreeAttempt(input)).toBe(true);
  expect(checkTruthTree(input).status).toBe('invalid');
  input.tree.expansions[0]!.ruleId = 'disjunction';
  expect(isFinishedTruthTreeAttempt(input)).toBe(false);
});

test('malformed written formulas can finish when their processing is filled, but not remain unresolved on an open path', () => {
  const input = completeTree(['P & Q'], 'R');
  input.tree.occurrences[0]!.formula = 'P &';
  expect(isFinishedTruthTreeAttempt(input)).toBe(true);
  expect(checkTruthTree(input).status).toBe('invalid');
  const unprocessed = initialTree(['P & Q'], 'R');
  unprocessed.tree.occurrences[0]!.formula = 'P &';
  expect(isFinishedTruthTreeAttempt(unprocessed)).toBe(false);
});

test('an open contradictory but fully processed path can complete with a retained closure warning', () => {
  const input = initialTree(['P'], 'P');
  expect(isFinishedTruthTreeAttempt(input)).toBe(true);
  expect(checkTruthTree(input)).toMatchObject({
    status: 'incomplete',
    branches: [{ status: 'needs_closure' }],
  });
});

test('all initial source identities must be present exactly once, while incorrect text is retained for review', () => {
  const input = completeTree(['P'], 'Q');
  input.tree.occurrences[0]!.formula = 'R';
  expect(isFinishedTruthTreeAttempt(input)).toBe(true);
  expect(checkTruthTree(input).status).toBe('invalid');
  input.tree.occurrences[0]!.origin = { kind: 'premise', premiseId: id(999) };
  expect(isFinishedTruthTreeAttempt(input)).toBe(false);
});

test.each([
  'blank_formula',
  'missing_closure',
  'missing_source',
  'missing_rule',
  'unknown_rule',
  'missing_premise',
  'duplicate_conclusion',
] as const)('unfinished selection %s cannot finalize completion', (field) => {
  const input = completeTree(['!!P'], 'P');
  if (field === 'blank_formula') input.tree.occurrences[0]!.formula = ' ';
  if (field === 'missing_closure')
    input.tree.branches[0]!.ending = { kind: 'closed', closure: null };
  // This fixture can close by the initial complementary pair; add an event if needed.
  if (['missing_source', 'missing_rule', 'unknown_rule'].includes(field)) {
    const open = completeTree(['P & Q'], 'R');
    if (field === 'missing_source') open.tree.expansions[0]!.sourceId = null;
    if (field === 'missing_rule') open.tree.expansions[0]!.ruleId = null;
    if (field === 'unknown_rule') open.tree.expansions[0]!.ruleId = 'unknown';
    expect(isFinishedTruthTreeAttempt(open)).toBe(false);
    return;
  }
  if (field === 'missing_premise') input.problem.premises.push({ id: id(999), formula: 'R' });
  if (field === 'duplicate_conclusion')
    input.tree.occurrences[0]!.origin = { kind: 'negated_conclusion' };
  expect(isFinishedTruthTreeAttempt(input)).toBe(false);
});

test.each([
  null,
  {},
  { ...initialTree([], 'P'), problem: { ruleCatalogVersion: 2 } },
  { ...initialTree([], 'P'), tree: { occurrences: Array(201).fill(null) } },
])('malformed/configuration/resource failures cannot count as finished: %#', (input) => {
  expect(isFinishedTruthTreeAttempt(input)).toBe(false);
});

test('rule field counts agree with decomposition outputs and are deeply immutable', () => {
  const sources = [
    '!!P',
    'P & Q',
    '!(P & Q)',
    'P v Q',
    '!(P v Q)',
    'P -> Q',
    '!(P -> Q)',
    'P <-> Q',
    '!(P <-> Q)',
  ];
  for (const source of sources) {
    const decomposition = decomposeTruthTreeFormula(parseTruthTreeFormula(source));
    if (decomposition.kind !== 'expansion') throw Error('Expected expansion fixture.');
    const rule = TRUTH_TREE_RULE_CATALOG.find((rule) => rule.id === decomposition.ruleId)!;
    expect(rule.resultFormulaCounts).toEqual(decomposition.branches.map((branch) => branch.length));
    expect(Object.isFrozen(rule.resultFormulaCounts)).toBe(true);
  }
});
