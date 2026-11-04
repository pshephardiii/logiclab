import {
  dependencyProofSchema,
  dependencyProofCheckInputSchema,
  proofCheckInputSchema,
  PROOF_LIMITS,
} from '@logiclab/contracts';
import { derivationAnswerSchema } from '@logiclab/contracts/derivation-work';
import { derivationDefinitionSchema } from '@logiclab/contracts/derivation';
import { derivationDefinitionFixture } from './derivation-fixture';

const p = 'a1111111-1111-4111-8111-111111111111';
const a = 'b2222222-2222-4222-8222-222222222222';
const c = 'c3333333-3333-4333-8333-333333333333';
const premiseId = 'd4444444-4444-4444-8444-444444444444';
const proof = {
  proofVersion: 1,
  format: 'dependency',
  steps: [
    { kind: 'premise', id: p, formula: 'P', premiseId, dependencies: [p] },
    { kind: 'assumption', id: a, formula: 'Q', dependencies: [a] },
    {
      kind: 'inference',
      id: c,
      formula: 'Q -> Q',
      dependencies: [],
      ruleId: 'implication_introduction',
      lineReferences: [],
      discharges: [{ assumptionId: a, conclusionId: a }],
    },
  ],
};
const problem = {
  ruleCatalogVersion: 1,
  premises: [{ id: premiseId, formula: 'P' }],
  conclusion: 'Q -> Q',
  permittedRuleIds: ['implication_introduction'],
};

test('dependency transport round-trips stable sources and discharge identities without changing input', () => {
  const before = structuredClone(proof);
  expect(dependencyProofCheckInputSchema.parse({ problem, proof })).toEqual({ problem, proof });
  expect(proof).toEqual(before);
  const reordered = { ...proof, steps: [...proof.steps].reverse() };
  expect(dependencyProofSchema.parse(reordered).steps[0]).toEqual(proof.steps[2]);
});

test('source IDs and references normalize UUID spelling consistently', () => {
  const input = structuredClone(proof);
  input.steps[0]!.id = p.toUpperCase();
  input.steps[0]!.dependencies = [p.toUpperCase()];
  input.steps[2]!.discharges![0]!.assumptionId = a.toUpperCase();
  const parsed = dependencyProofSchema.parse(input);
  expect(parsed.steps[0]!.id).toBe(p);
  expect(parsed.steps[0]!.dependencies).toEqual([p]);
  const inference = parsed.steps[2]!;
  if (inference.kind !== 'inference') throw new Error('Expected inference');
  expect(inference.discharges[0]!.assumptionId).toBe(a);
});

test('incomplete fields, syntax mistakes and erroneous dependency annotations remain draft data', () => {
  expect(
    dependencyProofSchema.parse({ proofVersion: 1, format: 'dependency', steps: [] }).steps,
  ).toEqual([]);
  const input = {
    ...proof,
    steps: [
      { kind: 'premise', id: p, formula: '', premiseId: null, dependencies: [] },
      { kind: 'assumption', id: a, formula: 'P &', dependencies: [c] },
      {
        kind: 'inference',
        id: c,
        formula: '',
        dependencies: [a, a],
        ruleId: null,
        lineReferences: [c],
        discharges: [{ assumptionId: null, conclusionId: null }],
      },
    ],
  };
  expect(dependencyProofSchema.parse(input)).toEqual(input);
});

test.each([
  { ...proof, proofVersion: 2 },
  { ...proof, format: 'fitch' },
  { ...proof, blocks: [] },
  { ...proof, accepted: true },
  { ...proof, steps: [{ ...proof.steps[0], blockId: null }] },
  { ...proof, steps: [{ ...proof.steps[0], lineNumber: 1 }] },
  { ...proof, steps: [{ ...proof.steps[0], id: '1' }] },
  {
    ...proof,
    steps: [{ ...proof.steps[0], formula: 'P'.repeat(PROOF_LIMITS.maxFormulaLength + 1) }],
  },
  { ...proof, steps: [{ ...proof.steps[2], ruleId: 'Custom rule' }] },
  { ...proof, steps: [{ ...proof.steps[2], subproofReferences: [a] }] },
  {
    ...proof,
    steps: [{ ...proof.steps[2], discharges: [{ assumptionId: a, conclusionId: c, valid: true }] }],
  },
])('strict dependency transport rejects unsupported/private structure %#', (input) => {
  expect(dependencyProofSchema.safeParse(input).success).toBe(false);
});

test.each(['steps', 'dependencies', 'lineReferences', 'discharges'] as const)(
  'bounds %s without confusing transport limits with proof validity',
  (field) => {
    const max = field === 'steps' || field === 'dependencies' ? PROOF_LIMITS.maxSteps : 2;
    function input(length: number) {
      if (field === 'steps')
        return { ...proof, steps: Array.from({ length }, () => proof.steps[0]) };
      const value = field === 'discharges' ? { assumptionId: a, conclusionId: p } : p;
      return {
        ...proof,
        steps: [{ ...proof.steps[2], [field]: Array.from({ length }, () => value) }],
      };
    }
    expect(dependencyProofSchema.safeParse(input(max)).success).toBe(true);
    expect(dependencyProofSchema.safeParse(input(max + 1)).success).toBe(false);
  },
);

test('Fitch-only contracts keep rejecting dependency input after shared workflows support both formats', () => {
  expect(proofCheckInputSchema.safeParse({ problem, proof }).success).toBe(false);
  expect(derivationAnswerSchema.safeParse({ type: 'derivation', proof }).success).toBe(false);
  expect(
    derivationDefinitionSchema.safeParse({
      ...derivationDefinitionFixture(),
      format: 'dependency',
      referenceProof: proof,
    }).success,
  ).toBe(false);
});
