import { PROOF_LIMITS, type ProofCheckInput } from '@logiclab/contracts';
import { isFinishedProofAttempt, checkProof } from '../src/proof';

let sequence = 0;
const nextId = () => `${(++sequence).toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`;

function fixture(): ProofCheckInput {
  const premiseId = nextId();
  const first = nextId();
  return {
    problem: {
      ruleCatalogVersion: 1,
      premises: [{ id: premiseId, formula: 'P' }],
      conclusion: 'P',
      permittedRuleIds: ['reiteration'],
    },
    proof: {
      proofVersion: 1,
      format: 'fitch',
      blocks: [],
      steps: [
        { kind: 'premise', id: first, blockId: null, formula: 'P', premiseId },
        {
          kind: 'inference',
          id: nextId(),
          blockId: null,
          formula: 'P',
          ruleId: 'reiteration',
          lineReferences: [first],
          subproofReferences: [],
        },
      ],
    },
  };
}
test('finished work is independent from verification, including wrong premise text and inference patterns', () => {
  const input = fixture();
  expect(isFinishedProofAttempt(input)).toBe(true);
  expect(checkProof(input).status).toBe('accepted');
  input.proof.steps[0]!.formula = 'Q';
  const snapshot = structuredClone(input);
  expect(isFinishedProofAttempt(input)).toBe(true);
  expect(checkProof(input).status).toBe('needs_review');
  expect(input).toEqual(snapshot);
});
test('filled nonfinal syntax errors remain mistakes for later diagnostics rather than pre-submission checking', () => {
  const input = fixture();
  input.proof.steps[0]!.formula = 'P &';
  expect(isFinishedProofAttempt(input)).toBe(true);
  expect(checkProof(input).status).toBe('needs_review');
});
test('filled citations can be logically wrong, including unavailable scope and repeated/forward/self citations', () => {
  const input = fixture();
  const block = nextId();
  const assumption = nextId();
  input.proof.steps.splice(1, 0, {
    kind: 'assumption',
    id: assumption,
    blockId: block,
    formula: 'Q',
  });
  input.proof.blocks = [{ id: block, parentId: null, assumptionId: assumption, endId: assumption }];
  const last = input.proof.steps.at(-1)!;
  if (last.kind !== 'inference') throw new Error('Expected inference');
  last.lineReferences = [assumption];
  expect(isFinishedProofAttempt(input)).toBe(true);
  expect(checkProof(input).status).toBe('needs_review');
  last.lineReferences = [last.id];
  expect(isFinishedProofAttempt(input)).toBe(true);
  const first = input.proof.steps[0]!;
  input.proof.steps[0] = {
    kind: 'inference',
    id: first.id,
    blockId: null,
    formula: 'P',
    ruleId: 'reiteration',
    lineReferences: [last.id],
    subproofReferences: [],
  };
  expect(isFinishedProofAttempt(input)).toBe(true);
  input.problem.permittedRuleIds = ['and_introduction'];
  last.ruleId = 'and_introduction';
  last.formula = 'P & P';
  last.lineReferences = [first.id, first.id];
  input.problem.conclusion = 'P & P';
  input.proof.steps[0] = first;
  expect(isFinishedProofAttempt(input)).toBe(true);
});
test.each([
  [
    'missing steps',
    (input: ProofCheckInput) => {
      input.proof.steps = [];
    },
  ],
  [
    'blank formula',
    (input: ProofCheckInput) => {
      input.proof.steps[0]!.formula = '   ';
    },
  ],
  [
    'missing premise selection',
    (input: ProofCheckInput) => {
      const first = input.proof.steps[0]!;
      if (first.kind === 'premise') first.premiseId = null;
    },
  ],
  [
    'foreign premise',
    (input: ProofCheckInput) => {
      const first = input.proof.steps[0]!;
      if (first.kind === 'premise') first.premiseId = nextId();
    },
  ],
  [
    'missing rule',
    (input: ProofCheckInput) => {
      const last = input.proof.steps[1]!;
      if (last.kind === 'inference') last.ruleId = null;
    },
  ],
  [
    'disabled rule',
    (input: ProofCheckInput) => {
      input.problem.permittedRuleIds = [];
    },
  ],
  [
    'unknown rule',
    (input: ProofCheckInput) => {
      const last = input.proof.steps[1]!;
      if (last.kind === 'inference') last.ruleId = 'custom_rule';
    },
  ],
  [
    'missing citation',
    (input: ProofCheckInput) => {
      const last = input.proof.steps[1]!;
      if (last.kind === 'inference') last.lineReferences = [];
    },
  ],
  [
    'extra citation',
    (input: ProofCheckInput) => {
      const last = input.proof.steps[1]!;
      if (last.kind === 'inference') last.lineReferences.push(last.id);
    },
  ],
  [
    'deleted citation',
    (input: ProofCheckInput) => {
      const last = input.proof.steps[1]!;
      if (last.kind === 'inference') last.lineReferences = [nextId()];
    },
  ],
  [
    'wrong final target',
    (input: ProofCheckInput) => {
      input.proof.steps[1]!.formula = 'Q';
    },
  ],
  [
    'malformed final formula',
    (input: ProofCheckInput) => {
      input.proof.steps[1]!.formula = 'P &';
    },
  ],
  [
    'duplicate identity',
    (input: ProofCheckInput) => {
      input.proof.steps[1]!.id = input.proof.steps[0]!.id;
    },
  ],
  [
    'unknown configuration',
    (input: ProofCheckInput) => {
      input.problem.permittedRuleIds.push('custom_rule');
    },
  ],
] as const)('%s is not finished work', (_name, change) => {
  const input = fixture();
  change(input);
  const snapshot = structuredClone(input);
  expect(isFinishedProofAttempt(input)).toBe(false);
  expect(input).toEqual(snapshot);
});
test('closed subproofs require explicit boundaries and filled block citations', () => {
  const a = nextId();
  const b = nextId();
  const block = nextId();
  const input: ProofCheckInput = {
    problem: {
      ruleCatalogVersion: 1,
      premises: [],
      conclusion: 'P -> P',
      permittedRuleIds: ['implication_introduction'],
    },
    proof: {
      proofVersion: 1,
      format: 'fitch',
      blocks: [{ id: block, parentId: null, assumptionId: a, endId: a }],
      steps: [
        { kind: 'assumption', id: a, blockId: block, formula: 'P' },
        {
          kind: 'inference',
          id: b,
          blockId: null,
          formula: 'P -> P',
          ruleId: 'implication_introduction',
          lineReferences: [],
          subproofReferences: [block],
        },
      ],
    },
  };
  expect(isFinishedProofAttempt(input)).toBe(true);
  input.proof.blocks[0]!.endId = null;
  expect(isFinishedProofAttempt(input)).toBe(false);
  input.proof.blocks[0]!.endId = a;
  input.proof.blocks[0]!.parentId = block;
  expect(isFinishedProofAttempt(input)).toBe(false);
  input.proof.blocks[0]!.parentId = null;
  const last = input.proof.steps[1]!;
  if (last.kind !== 'inference') throw new Error('Expected inference');
  last.subproofReferences = [nextId()];
  expect(isFinishedProofAttempt(input)).toBe(false);
  input.proof.steps.pop();
  expect(isFinishedProofAttempt(input)).toBe(false);
});
test('target matching accepts notation/grouping aliases without silently applying equivalence rules', () => {
  const input = fixture();
  input.problem.conclusion = '~(P v Q)';
  input.proof.steps[1]!.formula = '¬[P ∨ Q]';
  expect(isFinishedProofAttempt(input)).toBe(true);
  input.proof.steps[1]!.formula = '!P & !Q';
  expect(isFinishedProofAttempt(input)).toBe(false);
});
test('raw shape/version/resource boundaries fail closed without invoking getters', () => {
  expect(isFinishedProofAttempt(null)).toBe(false);
  const input = fixture();
  expect(isFinishedProofAttempt({ ...input, report: {} })).toBe(false);
  expect(isFinishedProofAttempt({ ...input, proof: { ...input.proof, proofVersion: 2 } })).toBe(
    false,
  );
  expect(
    isFinishedProofAttempt({
      ...input,
      proof: { ...input.proof, steps: Array(PROOF_LIMITS.maxSteps + 1).fill(input.proof.steps[0]) },
    }),
  ).toBe(false);
  const getter = jest.fn(() => input.proof);
  const unsafe = Object.defineProperty({ problem: input.problem }, 'proof', {
    enumerable: true,
    get: getter,
  });
  expect(isFinishedProofAttempt(unsafe)).toBe(false);
  expect(getter).not.toHaveBeenCalled();
});
