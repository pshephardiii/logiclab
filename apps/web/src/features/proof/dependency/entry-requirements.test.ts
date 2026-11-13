import type { DependencyProof } from '@logiclab/contracts';
import { expect, test } from 'vitest';
import { dependencyEntryRequirement } from './entry-requirements';

function fixture(): DependencyProof {
  return {
    format: 'dependency',
    proofVersion: 1,
    steps: [
      {
        id: 'premise',
        kind: 'premise',
        premiseId: 'source',
        formula: 'P',
        dependencies: ['premise'],
      },
      { id: 'assumption', kind: 'assumption', formula: 'Q', dependencies: ['assumption'] },
      {
        id: 'entry',
        kind: 'inference',
        formula: 'P',
        ruleId: 'reiteration',
        dependencies: [],
        lineReferences: ['premise'],
        discharges: [],
      },
    ],
  };
}
const rules = [
  { id: 'reiteration' },
  { id: 'implication_introduction' },
  { id: 'excluded_middle' },
  { id: 'or_elimination' },
];

test('requires formula, enabled rule and available required citations while allowing empty dependencies', () => {
  const proof = fixture(),
    step = proof.steps[2]!;
  if (step.kind !== 'inference') throw new Error();
  expect(dependencyEntryRequirement(proof, 2, rules)).toBeNull();
  step.formula = 'P &';
  expect(dependencyEntryRequirement(proof, 2, rules)).toBeNull();
  step.formula = '';
  expect(dependencyEntryRequirement(proof, 2, rules)).toMatch(/formula/);
  step.formula = 'P';
  step.ruleId = null;
  expect(dependencyEntryRequirement(proof, 2, rules)).toMatch(/rule/);
  step.ruleId = 'reiteration';
  expect(dependencyEntryRequirement(proof, 2, [])).toMatch(/rule/);
  step.lineReferences = [];
  expect(dependencyEntryRequirement(proof, 2, rules)).toMatch(/1 line citation/);
  step.lineReferences = [''];
  expect(dependencyEntryRequirement(proof, 2, rules)).toMatch(/1 line citation/);
  step.lineReferences = ['entry'];
  expect(dependencyEntryRequirement(proof, 2, rules)).toMatch(/unavailable/);
});

test('requires each discharge pair, preserves zero-input rules and does not evaluate support or the inference', () => {
  const proof = fixture(),
    step = proof.steps[2]!;
  if (step.kind !== 'inference') throw new Error();
  step.ruleId = 'implication_introduction';
  expect(dependencyEntryRequirement(proof, 2, rules)).toMatch(/clear them/);
  step.lineReferences = [];
  expect(dependencyEntryRequirement(proof, 2, rules)).toMatch(/discharge pair/);
  step.discharges = [{ assumptionId: 'assumption', conclusionId: null }];
  expect(dependencyEntryRequirement(proof, 2, rules)).toMatch(/discharge pair/);
  step.discharges = [{ assumptionId: 'premise', conclusionId: 'premise' }];
  expect(dependencyEntryRequirement(proof, 2, rules)).toMatch(/available assumption/);
  step.discharges = [{ assumptionId: 'assumption', conclusionId: 'assumption' }];
  expect(dependencyEntryRequirement(proof, 2, rules)).toBeNull(); // The P conclusion is logically wrong, but fields are filled.
  step.ruleId = 'excluded_middle';
  expect(dependencyEntryRequirement(proof, 2, rules)).toMatch(/remove the discharge pairs/);
  step.discharges = [];
  expect(dependencyEntryRequirement(proof, 2, rules)).toBeNull();
  step.ruleId = 'or_elimination';
  step.lineReferences = ['premise'];
  step.discharges = [{ assumptionId: 'assumption', conclusionId: 'assumption' }];
  expect(dependencyEntryRequirement(proof, 2, rules)).toMatch(/2 discharge pairs/);
});

test('an opening assumption needs no rule or citations and has its dependency set checked later', () => {
  const proof = fixture();
  proof.steps[1]!.dependencies = [];
  expect(dependencyEntryRequirement(proof, 1, [])).toBeNull();
  proof.steps[1]!.formula = '';
  expect(dependencyEntryRequirement(proof, 1, [])).toMatch(/formula/);
});
