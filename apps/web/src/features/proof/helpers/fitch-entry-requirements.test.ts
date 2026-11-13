import type { FitchProof } from '@logiclab/contracts';
import { expect, test } from 'vitest';
import { fitchEntryRequirement } from './fitch-entry-requirements';

function fixture(): FitchProof {
  return {
    format: 'fitch',
    proofVersion: 1,
    blocks: [],
    steps: [
      { id: 'premise', kind: 'premise', formula: 'P', blockId: null, premiseId: 'source' },
      {
        id: 'entry',
        kind: 'inference',
        formula: 'Q',
        blockId: null,
        ruleId: 'reiteration',
        lineReferences: ['premise'],
        subproofReferences: [],
      },
    ],
  };
}
const rules = [
  { id: 'reiteration' },
  { id: 'implication_introduction' },
  { id: 'excluded_middle' },
];

test('requires a nonblank formula, enabled catalog rule and available earlier citations without evaluating logic', () => {
  const proof = fixture();
  const step = proof.steps[1]!;
  if (step.kind !== 'inference') throw new Error();
  expect(fitchEntryRequirement(proof, 1, rules)).toBeNull(); // Q does not follow from P by reiteration.
  step.formula = 'P &';
  expect(fitchEntryRequirement(proof, 1, rules)).toBeNull(); // Syntax diagnostics still belong to Check proof.
  step.formula = '  ';
  expect(fitchEntryRequirement(proof, 1, rules)).toMatch(/formula/);
  step.formula = 'P';
  step.ruleId = null;
  expect(fitchEntryRequirement(proof, 1, rules)).toMatch(/rule/);
  step.ruleId = 'reiteration';
  expect(fitchEntryRequirement(proof, 1, [])).toMatch(/rule/);
  step.lineReferences = [];
  expect(fitchEntryRequirement(proof, 1, rules)).toMatch(/1 line citation/);
  step.lineReferences = [''];
  expect(fitchEntryRequirement(proof, 1, rules)).toMatch(/1 line citation/);
  step.lineReferences = ['entry'];
  expect(fitchEntryRequirement(proof, 1, rules)).toMatch(/unavailable/);
  step.lineReferences = ['missing'];
  expect(fitchEntryRequirement(proof, 1, rules)).toMatch(/unavailable/);
});

test('subproof and zero-input rules use their catalog arity, leaving closure and logical validity to explicit checks', () => {
  const proof = fixture();
  const step = proof.steps[1]!;
  if (step.kind !== 'inference') throw new Error();
  step.ruleId = 'implication_introduction';
  expect(fitchEntryRequirement(proof, 1, rules)).toMatch(/does not use line citations/);
  step.lineReferences = [];
  expect(fitchEntryRequirement(proof, 1, rules)).toMatch(/1 subproof citation/);
  step.subproofReferences = ['missing'];
  expect(fitchEntryRequirement(proof, 1, rules)).toMatch(/unavailable/);
  proof.blocks = [{ id: 'block', parentId: null, assumptionId: 'missing', endId: null }];
  step.subproofReferences = ['block'];
  expect(fitchEntryRequirement(proof, 1, rules)).toBeNull();
  step.ruleId = 'excluded_middle';
  expect(fitchEntryRequirement(proof, 1, rules)).toMatch(/does not use subproof citations/);
  step.subproofReferences = [];
  expect(fitchEntryRequirement(proof, 1, rules)).toBeNull();
});

test('an opening assumption needs a formula but no inference rule or citations', () => {
  const proof = fixture();
  proof.steps[1] = { id: 'assumption', kind: 'assumption', blockId: 'block', formula: 'P' };
  expect(fitchEntryRequirement(proof, 1, [])).toBeNull();
  proof.steps[1]!.formula = '';
  expect(fitchEntryRequirement(proof, 1, [])).toMatch(/formula/);
});
