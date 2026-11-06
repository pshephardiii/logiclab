import {
  treeProofSchema,
  treeProofCheckInputSchema,
  fitchProofCheckInputSchema,
  dependencyProofSchema,
  PROOF_LIMITS,
} from '@logiclab/contracts';
import { fitchDerivationDefinitionSchema } from '@logiclab/contracts/derivation';
import { fitchDerivationAnswerSchema } from '@logiclab/contracts/derivation-work';
import { libraryProblemDefinitionSchema } from '@logiclab/contracts/problem-library';
import { savedDerivationAnswerSchema } from '@logiclab/contracts/saved-student-work';
import { derivationDefinitionFixture } from './derivation-fixture';

const a = 'a1111111-1111-4111-8111-111111111111';
const b = 'b2222222-2222-4222-8222-222222222222';
const c = 'c3333333-3333-4333-8333-333333333333';
const premiseId = 'd4444444-4444-4444-8444-444444444444';
const assumption = { id: a, kind: 'assumption', formula: 'P' };
const inference = {
  id: b,
  kind: 'inference',
  formula: 'P -> P',
  ruleId: 'implication_introduction',
  lineReferences: [],
  branches: [{ rootId: a, assumptionFormula: 'P', assumptionIds: [a] }],
};
const proof = { proofVersion: 1, format: 'tree', rootId: b, nodes: [assumption, inference] };
const problem = {
  ruleCatalogVersion: 1,
  premises: [],
  conclusion: 'P -> P',
  permittedRuleIds: ['implication_introduction'],
};

test('tree transport preserves identities, child direction and explicit branch discharge', () => {
  const before = structuredClone(proof);
  expect(treeProofCheckInputSchema.parse({ problem, proof })).toEqual({ problem, proof });
  expect(proof).toEqual(before);
  const reordered = { ...proof, nodes: [...proof.nodes].reverse() };
  expect(treeProofSchema.parse(reordered)).toEqual(reordered);
});

test('repeated premise occurrences have separate node IDs but the same authoritative premise ID', () => {
  const nodes = [a, b].map((id) => ({ id, kind: 'premise', formula: 'P', premiseId }));
  const input = {
    ...proof,
    rootId: c,
    nodes: [
      ...nodes,
      {
        ...inference,
        id: c,
        formula: 'P & P',
        ruleId: 'and_introduction',
        lineReferences: [a, b],
        branches: [],
      },
    ],
  };
  expect(treeProofSchema.parse(input)).toEqual(input);
});

test('a branch can discharge several assumption occurrences or explicitly declare vacuous discharge', () => {
  for (const assumptionIds of [[a, c], []]) {
    const node = { ...inference, branches: [{ rootId: a, assumptionFormula: 'P', assumptionIds }] };
    expect(treeProofSchema.parse({ ...proof, nodes: [node] }).nodes[0]).toEqual(node);
  }
});

test('empty and unfinished drafts retain blank fields and null selections', () => {
  const empty = { ...proof, rootId: null, nodes: [] };
  expect(treeProofSchema.parse(empty)).toEqual(empty);
  const draft = {
    ...empty,
    nodes: [
      { id: a, kind: 'premise', formula: '', premiseId: null },
      { id: b, kind: 'assumption', formula: '' },
      {
        ...inference,
        id: c,
        formula: '',
        ruleId: null,
        branches: [{ rootId: null, assumptionFormula: '', assumptionIds: [] }],
      },
    ],
  };
  expect(treeProofSchema.parse(draft)).toEqual(draft);
});

test('schema parsing does not certify tree structure or logical correctness', () => {
  // Cycles, duplicate nodes, disconnected work and unresolved citations need engine diagnostics.
  const unfinished = { ...proof, nodes: [inference, inference] };
  expect(treeProofSchema.safeParse(unfinished).success).toBe(true);
  expect(treeProofSchema.safeParse({ ...proof, rootId: c }).success).toBe(true);
});

test('all UUID fields are normalized without mutating the input', () => {
  const upper = {
    ...proof,
    rootId: b.toUpperCase(),
    nodes: [
      {
        ...inference,
        id: b.toUpperCase(),
        lineReferences: [c.toUpperCase()],
        branches: [
          { rootId: a.toUpperCase(), assumptionFormula: 'P', assumptionIds: [a.toUpperCase()] },
        ],
      },
    ],
  };
  const before = structuredClone(upper);
  const parsed = treeProofSchema.parse(upper);
  expect(parsed.rootId).toBe(b);
  expect(parsed.nodes[0]).toEqual({ ...inference, lineReferences: [c] });
  expect(upper).toEqual(before);
});

test.each([
  { proofVersion: 2 },
  { format: 'fitch' },
  { rootId: 'not-a-uuid' },
  { referenceProof: proof },
  { report: { status: 'accepted' } },
  { blocks: [] },
])('rejects unsupported versions, identities and extra proof fields: %j', (change) => {
  expect(treeProofSchema.safeParse({ ...proof, ...change }).success).toBe(false);
});

test.each([
  { kind: 'other' },
  { id: 'not-a-uuid' },
  { formula: 'P'.repeat(PROOF_LIMITS.maxFormulaLength + 1) },
  { ruleId: 'MP' },
  { lineReferences: [a, b, c] },
  { branches: [inference.branches[0], inference.branches[0], inference.branches[0]] },
  { dependencies: [] },
  { blockId: null },
  { branches: [{ rootId: a, assumptionFormula: 'P', assumptionIds: [a], label: '1' }] },
  {
    branches: [
      {
        rootId: a,
        assumptionFormula: 'P',
        assumptionIds: Array(PROOF_LIMITS.maxSteps + 1).fill(a),
      },
    ],
  },
  {
    branches: [
      {
        rootId: a,
        assumptionFormula: 'P'.repeat(PROOF_LIMITS.maxFormulaLength + 1),
        assumptionIds: [],
      },
    ],
  },
])('rejects invalid node transport fields: %j', (change) => {
  expect(
    treeProofSchema.safeParse({ ...proof, nodes: [{ ...inference, ...change }] }).success,
  ).toBe(false);
});

test('enforces the node limit while leaving logical validation to the checker', () => {
  expect(
    treeProofSchema.safeParse({ ...proof, nodes: Array(PROOF_LIMITS.maxSteps).fill(assumption) })
      .success,
  ).toBe(true);
  expect(
    treeProofSchema.safeParse({
      ...proof,
      nodes: Array(PROOF_LIMITS.maxSteps + 1).fill(assumption),
    }).success,
  ).toBe(false);
});

test('tree inputs retain authoritative statement bounds and reject student replacement metadata', () => {
  expect(
    treeProofCheckInputSchema.safeParse({ problem: { ...problem, conclusion: '' }, proof }).success,
  ).toBe(false);
  expect(treeProofCheckInputSchema.safeParse({ problem, proof, reference: proof }).success).toBe(
    false,
  );
});

test('Fitch/dependency/student boundaries stay separate while the owner library admits trees', () => {
  expect(fitchProofCheckInputSchema.safeParse({ problem, proof }).success).toBe(false);
  expect(dependencyProofSchema.safeParse(proof).success).toBe(false);
  expect(fitchDerivationAnswerSchema.safeParse({ type: 'derivation', proof }).success).toBe(false);
  expect(savedDerivationAnswerSchema.safeParse({ type: 'derivation', proof }).success).toBe(true);
  const definition = derivationDefinitionFixture();
  expect(
    fitchDerivationDefinitionSchema.safeParse({
      ...definition,
      format: 'tree',
      referenceProof: proof,
    }).success,
  ).toBe(false);
  expect(
    libraryProblemDefinitionSchema.safeParse({
      ...definition,
      format: 'tree',
      referenceProof: proof,
    }).success,
  ).toBe(true);
});
