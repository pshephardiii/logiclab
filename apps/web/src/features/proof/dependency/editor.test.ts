import { expect, test } from 'vitest';
import { PROOF_LIMITS, type DependencyProof } from '@logiclab/contracts';
import {
  startDependencyProof,
  insertDependencyStep,
  moveDependencyStep,
  removeDependencyStep,
} from './editor';

test('starting copies premises once with stable statement links and self dependencies', () => {
  const premises = [{ id: crypto.randomUUID(), formula: 'P' }];
  const proof = startDependencyProof(premises);
  expect(proof).toMatchObject({
    format: 'dependency',
    steps: [{ kind: 'premise', premiseId: premises[0]!.id, formula: 'P' }],
  });
  expect(proof.steps[0]!.dependencies).toEqual([proof.steps[0]!.id]);
  premises[0]!.formula = 'Q';
  expect(proof.steps[0]!.formula).toBe('P');
  expect(startDependencyProof(premises).steps[0]!.id).not.toBe(proof.steps[0]!.id);
});

test('insertion, reordering and deletion preserve incoming citations and source sets without repairing work', () => {
  let proof = insertDependencyStep(startDependencyProof([]), 0, 'assumption');
  const source = proof.steps[0]!;
  proof = insertDependencyStep(proof, 1, 'inference');
  const inference = proof.steps[1]!;
  if (inference.kind !== 'inference') throw new Error('Expected inference');
  proof.steps[1] = {
    ...inference,
    dependencies: [source.id],
    lineReferences: [source.id],
    discharges: [{ assumptionId: source.id, conclusionId: source.id }],
  };
  const before = structuredClone(proof);
  const moved = moveDependencyStep(proof, 1, -1);
  expect(moved.steps[0]).toEqual(proof.steps[1]);
  const removed = removeDependencyStep(proof, 0);
  expect(removed.steps[0]).toEqual(proof.steps[1]);
  expect(proof).toEqual(before);
  expect(insertDependencyStep(proof, 1, 'premise').steps[2]).toEqual(proof.steps[1]);
  expect(moveDependencyStep(proof, 0, -1)).toBe(proof);
});

test('bounded insertion rejects invalid positions, duplicate identities and full proofs', () => {
  const proof = insertDependencyStep(startDependencyProof([]), 0, 'assumption');
  for (const index of [-1, 2, 0.5])
    expect(() => insertDependencyStep(proof, index, 'inference')).toThrow();
  expect(() =>
    insertDependencyStep({ ...proof, steps: [proof.steps[0]!, proof.steps[0]!] }, 0, 'premise'),
  ).toThrow(/duplicate/);
  const full: DependencyProof = {
    ...proof,
    steps: Array.from({ length: PROOF_LIMITS.maxSteps }, () => ({
      ...proof.steps[0]!,
      id: crypto.randomUUID(),
    })),
  };
  expect(() => insertDependencyStep(full, 0, 'inference')).toThrow(/limit/);
});
