import type { DependencyProofCheckInput } from '@logiclab/contracts';
import { isFinishedDependencyProofAttempt, checkDependencyProof } from '../../../src/proof';
let sequence = 0;
const id = () => `${(++sequence).toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`;
function fixture(): DependencyProofCheckInput {
  const premiseId = id(),
    source = id();
  return {
    problem: {
      ruleCatalogVersion: 1,
      premises: [{ id: premiseId, formula: 'P' }],
      conclusion: 'P',
      permittedRuleIds: ['reiteration'],
    },
    proof: {
      proofVersion: 1,
      format: 'dependency',
      steps: [
        { kind: 'premise', id: source, premiseId, formula: 'P', dependencies: [source] },
        {
          kind: 'inference',
          id: id(),
          formula: 'P',
          ruleId: 'reiteration',
          lineReferences: [source],
          discharges: [],
          dependencies: [source],
        },
      ],
    },
  };
}
test('finished dependency work is independent of verification and does not modify formulas or support', () => {
  const input = fixture();
  expect(isFinishedDependencyProofAttempt(input)).toBe(true);
  expect(checkDependencyProof(input).status).toBe('accepted');
  input.proof.steps[0]!.formula = 'Q &';
  input.proof.steps[1]!.dependencies = [];
  const snapshot = structuredClone(input);
  expect(isFinishedDependencyProofAttempt(input)).toBe(true);
  expect(checkDependencyProof(input).status).toBe('needs_review');
  expect(input).toEqual(snapshot);
});
test('filled wrong rules, forward/self citations and undischarged assumption support remain completed mistakes', () => {
  const input = fixture();
  const assumption = id();
  input.proof.steps.splice(1, 0, {
    kind: 'assumption',
    id: assumption,
    formula: 'Q',
    dependencies: [assumption],
  });
  const last = input.proof.steps.at(-1)!;
  if (last.kind !== 'inference') throw new Error('Expected inference');
  last.lineReferences = [assumption];
  last.dependencies = [assumption];
  expect(isFinishedDependencyProofAttempt(input)).toBe(true);
  expect(checkDependencyProof(input).status).toBe('needs_review');
  last.lineReferences = [last.id];
  expect(isFinishedDependencyProofAttempt(input)).toBe(true);
});
test.each([
  'empty',
  'blank',
  'duplicate',
  'premise',
  'source',
  'inference_source',
  'rule',
  'permission',
  'arity',
  'citation',
  'target',
  'syntax',
  'assumption_final',
])('unfinished or unidentifiable %s is not completion', (kind) => {
  const input = fixture();
  const first = input.proof.steps[0]!,
    last = input.proof.steps[1]!;
  if (last.kind !== 'inference' || first.kind !== 'premise') throw new Error('Expected fixture');
  if (kind === 'empty') input.proof.steps = [];
  if (kind === 'blank') first.formula = '  ';
  if (kind === 'duplicate') last.id = first.id;
  if (kind === 'premise') first.premiseId = null;
  if (kind === 'source') last.dependencies = [id()];
  if (kind === 'inference_source') last.dependencies = [last.id];
  if (kind === 'rule') last.ruleId = null;
  if (kind === 'permission') input.problem.permittedRuleIds = [];
  if (kind === 'arity') last.lineReferences = [];
  if (kind === 'citation') last.lineReferences = [id()];
  if (kind === 'target') last.formula = 'Q';
  if (kind === 'syntax') last.formula = 'P &';
  if (kind === 'assumption_final')
    input.proof.steps[1] = {
      kind: 'assumption',
      id: last.id,
      formula: 'P',
      dependencies: [last.id],
    };
  expect(isFinishedDependencyProofAttempt(input)).toBe(false);
});
test('discharge pairs must be filled and identify an assumption and an existing conclusion', () => {
  const a = id(),
    b = id();
  const input: DependencyProofCheckInput = {
    problem: {
      ruleCatalogVersion: 1,
      premises: [],
      conclusion: 'P -> P',
      permittedRuleIds: ['implication_introduction'],
    },
    proof: {
      proofVersion: 1,
      format: 'dependency',
      steps: [
        { kind: 'assumption', id: a, formula: 'P', dependencies: [a] },
        {
          kind: 'inference',
          id: b,
          formula: 'P -> P',
          ruleId: 'implication_introduction',
          dependencies: [],
          lineReferences: [],
          discharges: [{ assumptionId: a, conclusionId: a }],
        },
      ],
    },
  };
  expect(isFinishedDependencyProofAttempt(input)).toBe(true);
  const last = input.proof.steps[1]!;
  if (last.kind !== 'inference') throw new Error('Expected inference');
  last.discharges[0]!.conclusionId = null;
  expect(isFinishedDependencyProofAttempt(input)).toBe(false);
  last.discharges[0] = { assumptionId: b, conclusionId: a };
  expect(isFinishedDependencyProofAttempt(input)).toBe(false);
});
test.each([null, {}, { proof: { format: 'fitch' } }, { problem: { ruleCatalogVersion: 2 } }])(
  'invalid transport/configuration returns false %#',
  (input) => {
    expect(isFinishedDependencyProofAttempt(input)).toBe(false);
  },
);
