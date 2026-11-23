import {
  truthTreeSchema,
  truthTreeCheckInputSchema,
  truthTreeProblemSchema,
  truthTreeRuleIdSchema,
  TRUTH_TREE_RULE_IDS,
  TRUTH_TREE_LIMITS,
  truthTreeClosureSchema,
  truthTreeExpansionSchema,
  type TruthTree,
} from '@logiclab/contracts/truth-tree';
import { isProofFormatAvailable, objectiveProblemDefinitionSchema } from '@logiclab/contracts';
import { libraryProblemDefinitionSchema } from '@logiclab/contracts/problem-library';
import { TRUTH_TREE_RULE_CATALOG } from '@logiclab/logic-engine/truth-tree';

const root = 'a1111111-1111-4111-8111-111111111111';
const left = 'b2222222-2222-4222-8222-222222222222';
const right = 'c3333333-3333-4333-8333-333333333333';
const premise = 'd4444444-4444-4444-8444-444444444444';
const conclusion = 'e5555555-5555-4555-8555-555555555555';
const leftFormula = 'f6666666-6666-4666-8666-666666666666';
const rightFormula = 'a7777777-7777-4777-8777-777777777777';
const expansion = 'b8888888-8888-4888-8888-888888888888';
const premiseIdentity = 'c9999999-9999-4999-8999-999999999999';

const tree: TruthTree = {
  treeVersion: 1,
  format: 'truth_tree',
  rootBranchId: root,
  occurrences: [
    { id: premise, formula: 'P v Q', origin: { kind: 'premise', premiseId: premiseIdentity } },
    { id: conclusion, formula: '!P', origin: { kind: 'negated_conclusion' } },
    { id: leftFormula, formula: 'P', origin: { kind: 'expansion', expansionId: expansion } },
    { id: rightFormula, formula: 'Q', origin: { kind: 'expansion', expansionId: expansion } },
  ],
  branches: [
    {
      id: root,
      parentId: null,
      occurrenceIds: [premise, conclusion],
      ending: { kind: 'split', expansionId: expansion, childBranchIds: [left, right] },
    },
    {
      id: left,
      parentId: root,
      occurrenceIds: [leftFormula],
      ending: {
        kind: 'closed',
        closure: { kind: 'complement', occurrenceIds: [leftFormula, conclusion] },
      },
    },
    { id: right, parentId: root, occurrenceIds: [rightFormula], ending: { kind: 'open' } },
  ],
  expansions: [
    {
      id: expansion,
      branchId: root,
      sourceId: premise,
      ruleId: 'disjunction',
      resultGroups: [
        { branchId: left, occurrenceIds: [leftFormula] },
        { branchId: right, occurrenceIds: [rightFormula] },
      ],
    },
  ],
};

const problem = {
  ruleCatalogVersion: 1,
  premises: [{ id: premiseIdentity, formula: 'P v Q' }],
  conclusion: 'P',
};

test('split transport retains identity and ancestor citations without copying initial formulas', () => {
  const input = { problem, tree };
  expect(truthTreeCheckInputSchema.parse(JSON.parse(JSON.stringify(input)))).toEqual(input);
  expect(tree.occurrences).toHaveLength(4);
  expect(tree.branches[1]!.occurrenceIds).toEqual([leftFormula]);
});

test('blank fields and partial splits/closures survive draft transport', () => {
  const draft = structuredClone(tree);
  draft.rootBranchId = null;
  draft.occurrences[0] = { id: premise, formula: '', origin: { kind: 'premise', premiseId: null } };
  draft.occurrences[2]!.origin = { kind: 'expansion', expansionId: null };
  draft.branches[0]!.ending = { kind: 'split', expansionId: null, childBranchIds: [] };
  draft.branches[1]!.ending = { kind: 'closed', closure: null };
  draft.expansions[0] = {
    id: expansion,
    branchId: root,
    sourceId: null,
    ruleId: null,
    resultGroups: [],
  };
  expect(truthTreeSchema.parse(draft)).toEqual(draft);
  expect(
    truthTreeSchema.safeParse({
      treeVersion: 1,
      format: 'truth_tree',
      rootBranchId: null,
      occurrences: [],
      branches: [],
      expansions: [],
    }).success,
  ).toBe(true);
});

test('nonbranching expansion records its results in the same ordered segment', () => {
  const draft = structuredClone(tree);
  draft.occurrences[0]!.formula = 'P & Q';
  draft.branches = [
    {
      id: root,
      parentId: null,
      occurrenceIds: [premise, conclusion, leftFormula, rightFormula],
      ending: { kind: 'open' },
    },
  ];
  draft.expansions[0] = {
    id: expansion,
    branchId: root,
    sourceId: premise,
    ruleId: 'conjunction',
    resultGroups: [{ branchId: root, occurrenceIds: [leftFormula, rightFormula] }],
  };
  expect(truthTreeSchema.parse(draft)).toEqual(draft);
});

test('falsity closure records one witness rather than a complementary pair', () => {
  const draft = structuredClone(tree);
  draft.branches[1]!.ending = {
    kind: 'closed',
    closure: { kind: 'falsity', occurrenceId: leftFormula },
  };
  expect(truthTreeSchema.parse(draft)).toEqual(draft);
});

test.each([
  { kind: 'complement', occurrenceIds: [premise] },
  { kind: 'complement', occurrenceIds: [premise, conclusion, leftFormula] },
  { kind: 'falsity', occurrenceId: premise, extra: true },
  { kind: 'complete_open' },
])('closure transport rejects wrong arity and invented verdicts: %#', (closure) => {
  expect(truthTreeClosureSchema.safeParse(closure).success).toBe(false);
});

test.each(['', 'Disjunction', 'disjunction introduction', 'a'.repeat(65)])(
  'rule references use bounded machine identifiers or null: %s',
  (ruleId) => {
    expect(truthTreeExpansionSchema.safeParse({ ...tree.expansions[0], ruleId }).success).toBe(
      false,
    );
  },
);

test('storage array order is not branch identity or display order', () => {
  const draft = structuredClone(tree);
  draft.branches.reverse();
  draft.occurrences.reverse();
  expect(truthTreeSchema.parse(draft)).toEqual(draft);
  expect(draft.rootBranchId).toBe(root);
  expect(draft.branches.find((branch) => branch.id === root)?.occurrenceIds).toEqual([
    premise,
    conclusion,
  ]);
});

test('UUID normalization covers nested identity and reference positions', () => {
  function capitalizeIds(value: unknown): unknown {
    if (typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value)) return value.toUpperCase();
    if (Array.isArray(value)) return value.map(capitalizeIds);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, capitalizeIds(entry)]),
      );
    return value;
  }
  expect(truthTreeCheckInputSchema.parse(capitalizeIds({ problem, tree }))).toEqual({
    problem,
    tree,
  });
});

test('shape validation leaves cycles, duplicate identities and cross-branch claims for the checker', () => {
  const draft = structuredClone(tree);
  draft.branches[0]!.parentId = left;
  draft.occurrences[1]!.id = premise;
  draft.branches[1]!.ending = {
    kind: 'closed',
    closure: { kind: 'complement', occurrenceIds: [leftFormula, rightFormula] },
  };
  expect(truthTreeSchema.safeParse(draft).success).toBe(true);
});

test('unknown rule references survive for diagnostics; the known catalog still agrees with contracts', () => {
  const draft = structuredClone(tree);
  draft.expansions[0]!.ruleId = 'future_rule';
  expect(truthTreeSchema.parse(draft).expansions[0]!.ruleId).toBe('future_rule');
  expect(truthTreeRuleIdSchema.safeParse('future_rule').success).toBe(false);
  expect(TRUTH_TREE_RULE_CATALOG.map((rule) => rule.id)).toEqual(TRUTH_TREE_RULE_IDS);
});

test.each([
  { ...tree, treeVersion: 3 },
  { ...tree, format: 'tree' },
  { ...tree, format: 'fitch' },
  { ...tree, rootBranchId: 'not-a-uuid' },
  { ...tree, accepted: true },
  { ...tree, branches: [{ ...tree.branches[0], extra: true }] },
  { ...tree, occurrences: [{ ...tree.occurrences[0], answer: true }] },
  { ...tree, expansions: [{ ...tree.expansions[0], checked: true }] },
])('unsupported versions, identities and injected fields are rejected: %#', (draft) => {
  expect(truthTreeSchema.safeParse(draft).success).toBe(false);
});

test.each([
  { ...tree, occurrences: Array(TRUTH_TREE_LIMITS.maxOccurrences + 1).fill(tree.occurrences[0]) },
  { ...tree, branches: Array(TRUTH_TREE_LIMITS.maxBranches + 1).fill(tree.branches[2]) },
  { ...tree, expansions: Array(TRUTH_TREE_LIMITS.maxExpansions + 1).fill(tree.expansions[0]) },
  {
    ...tree,
    occurrences: [
      { ...tree.occurrences[0], formula: 'P'.repeat(TRUTH_TREE_LIMITS.maxFormulaLength + 1) },
    ],
  },
  {
    ...tree,
    branches: [
      {
        ...tree.branches[0],
        occurrenceIds: Array(TRUTH_TREE_LIMITS.maxOccurrences + 1).fill(premise),
      },
    ],
  },
  {
    ...tree,
    branches: [
      {
        ...tree.branches[0],
        ending: { kind: 'split', expansionId: expansion, childBranchIds: [left, right, root] },
      },
    ],
  },
  {
    ...tree,
    expansions: [
      { ...tree.expansions[0], resultGroups: Array(3).fill(tree.expansions[0]!.resultGroups[0]) },
    ],
  },
  {
    ...tree,
    expansions: [
      {
        ...tree.expansions[0],
        resultGroups: [{ branchId: left, occurrenceIds: [premise, leftFormula, rightFormula] }],
      },
    ],
  },
])('oversized arrays and formula text are rejected: %#', (draft) => {
  expect(truthTreeSchema.safeParse(draft).success).toBe(false);
});

test('aggregate membership is bounded even when individual segments are within limits', () => {
  const draft = structuredClone(tree);
  draft.branches = [root, left].map((id) => ({
    id,
    parentId: null,
    occurrenceIds: Array(101).fill(premise),
    ending: { kind: 'open' },
  }));
  expect(truthTreeSchema.safeParse(draft).success).toBe(false);
  draft.branches[1]!.occurrenceIds = Array(99).fill(premise);
  expect(truthTreeSchema.safeParse(draft).success).toBe(true);
});

test('argument fields are bounded; formula correctness remains a checker obligation', () => {
  expect(truthTreeProblemSchema.safeParse({ ...problem, conclusion: 'P &' }).success).toBe(true);
  expect(truthTreeProblemSchema.safeParse({ ...problem, conclusion: '' }).success).toBe(false);
  expect(
    truthTreeProblemSchema.safeParse({ ...problem, premises: Array(51).fill(problem.premises[0]) })
      .success,
  ).toBe(false);
  expect(truthTreeProblemSchema.safeParse({ ...problem, ruleCatalogVersion: 2 }).success).toBe(
    false,
  );
});

test('standalone transport does not enable assignment/problem admission', () => {
  expect(isProofFormatAvailable('truth_tree')).toBe(false);
  expect(isProofFormatAvailable('tree')).toBe(false);
  expect(
    objectiveProblemDefinitionSchema.safeParse({ type: 'truth_tree', ...problem }).success,
  ).toBe(false);
  expect(
    libraryProblemDefinitionSchema.safeParse({
      type: 'derivation',
      format: 'truth_tree',
      ...problem,
    }).success,
  ).toBe(false);
});

test('catalog-2 standalone tree contracts do not enable unsupported application submissions', async () => {
  const { truthTreeDefinitionSchema } = await import('@logiclab/contracts/truth-tree-authoring');
  const { truthTreeAnswerSchema } = await import('@logiclab/contracts/truth-tree-work');
  const newer = { ...tree, treeVersion: 2 };
  expect(truthTreeSchema.safeParse(newer).success).toBe(true);
  expect(
    truthTreeAnswerSchema.safeParse({ type: 'truth_tree', tree: newer, verdict: 'valid' }).success,
  ).toBe(false);
  expect(
    truthTreeDefinitionSchema.safeParse({
      type: 'truth_tree',
      definitionVersion: 1,
      checkerVersion: 1,
      ruleCatalogVersion: 1,
      premises: problem.premises,
      conclusion: problem.conclusion,
      referenceTree: newer,
    }).success,
  ).toBe(false);
  expect(
    truthTreeProblemSchema.safeParse({
      ...problem,
      ruleCatalogVersion: 2,
      formulaGroupingVersion: 1,
    }).success,
  ).toBe(true);
});
