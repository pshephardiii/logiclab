import { expect, test } from 'vitest';
import { PROOF_LIMITS, type FitchProof } from '@logiclab/contracts';
import { checkFitchProof } from '@logiclab/logic-engine/proof';
import { derivationDefinition } from '../../../../test/derivation';
import {
  startFitchProof,
  insertFitchProofStep,
  insertFitchPremise,
  moveFitchProofStep,
  removeFitchProofStep,
  removeFitchSubproof,
  fitchProofDepth,
  fitchProofSubtree,
  uniqueFitchProofIds,
} from './fitch-editor';

function fixture() {
  let proof = startFitchProof(derivationDefinition);
  proof = insertFitchProofStep(proof, 0, null, true);
  const block = proof.blocks[0]!;
  proof.steps[0]!.formula = 'P';
  proof = { ...proof, blocks: [{ ...block, endId: proof.steps[0]!.id }] };
  proof = insertFitchProofStep(proof, 1, null);
  const last = proof.steps[1]!;
  if (last.kind !== 'inference') throw new Error('Expected inference');
  proof.steps[1] = {
    ...last,
    formula: 'P -> P',
    ruleId: 'implication_introduction',
    subproofReferences: [block.id],
  };
  return proof;
}

test('editor-generated single-assumption conditional proof is accepted without changing inputs', () => {
  const proof = fixture();
  const snapshot = structuredClone(proof);
  const report = checkFitchProof({
    problem: {
      ruleCatalogVersion: 1,
      premises: [],
      conclusion: 'P -> P',
      permittedRuleIds: ['implication_introduction'],
    },
    proof,
  });
  expect(report.status).toBe('accepted');
  expect(proof).toEqual(snapshot);
});

test('insertion/moving preserve citation identities, and deleted endpoints remain missing instead of retargeting', () => {
  const original = fixture();
  const id = original.steps[0]!.id;
  const block = original.blocks[0]!.id;
  const inserted = insertFitchProofStep(original, 1, block);
  expect(inserted.steps[2]).toEqual(original.steps[1]);
  const moved = moveFitchProofStep(inserted, 1, 1);
  expect(moved.steps[1]).toEqual(original.steps[1]);
  expect(moved.blocks[0]!.endId).toBe(id);
  // Deleting a cited inference also preserves incoming line references.
  const root = insertFitchProofStep(original, 2, null);
  const second = root.steps[2]!;
  if (second.kind !== 'inference') throw new Error('Expected inference');
  root.steps[2] = { ...second, lineReferences: [root.steps[1]!.id] };
  const removed = removeFitchProofStep(root, 1);
  expect(removed.steps[1]).toEqual(root.steps[2]);
  expect(() => removeFitchProofStep(root, 0)).toThrow('entire subproof');
  expect(original.steps).toHaveLength(2);
});

test('subproof deletion removes nested scopes only and preserves outside citations', () => {
  let proof = fixture();
  const parent = proof.blocks[0]!.id;
  proof = insertFitchProofStep(proof, 1, parent, true);
  const child = proof.blocks[1]!.id;
  expect(fitchProofSubtree(proof, parent)).toEqual(new Set([parent, child]));
  const result = removeFitchSubproof(proof, parent);
  expect(result.blocks).toEqual([]);
  expect(result.steps).toHaveLength(1);
  expect(result.steps[0]).toEqual(proof.steps[2]);
});

test('missing or cyclic scopes fail bounded insertion without repairing the saved proof', () => {
  const proof = fixture();
  const block = proof.blocks[0]!;
  const cyclic = { ...proof, blocks: [{ ...block, parentId: block.id }] };
  expect(fitchProofDepth(cyclic, block.id)).toBeNull();
  expect(() => insertFitchProofStep(cyclic, 1, block.id, true)).toThrow('valid parent chain');
  expect(fitchProofDepth(proof, crypto.randomUUID())).toBeNull();
  expect(() => insertFitchProofStep(proof, -1, null)).toThrow('insertion position');
});

test('step/block collisions disable ambiguous editing rather than silently assigning new IDs', () => {
  const proof = fixture();
  const duplicate = { ...proof, steps: [proof.steps[0]!, proof.steps[0]!] };
  expect(uniqueFitchProofIds(duplicate)).toBe(false);
  expect(() => insertFitchProofStep(duplicate, 1, null)).toThrow('duplicate');
  expect(
    uniqueFitchProofIds({ ...proof, blocks: [{ ...proof.blocks[0]!, id: proof.steps[0]!.id }] }),
  ).toBe(false);
});

test('resource limits block additional lines, blocks and nesting', () => {
  const empty: FitchProof = { proofVersion: 1, format: 'fitch', steps: [], blocks: [] };
  const full = {
    ...empty,
    steps: Array.from({ length: PROOF_LIMITS.maxSteps }, () => ({
      kind: 'premise' as const,
      id: crypto.randomUUID(),
      blockId: null,
      formula: '',
      premiseId: null,
    })),
  };
  expect(() => insertFitchProofStep(full, full.steps.length, null)).toThrow('line limit');
  let nested = empty;
  let parent: string | null = null;
  for (let index = 0; index < PROOF_LIMITS.maxBlockDepth; index++) {
    nested = insertFitchProofStep(nested, nested.steps.length, parent, true);
    parent = nested.blocks.at(-1)!.id;
  }
  expect(fitchProofDepth(nested, parent)).toBe(PROOF_LIMITS.maxBlockDepth);
  expect(() => insertFitchProofStep(nested, nested.steps.length, parent, true)).toThrow(
    'nesting limit',
  );
  const allBlocks = {
    ...empty,
    blocks: Array.from({ length: PROOF_LIMITS.maxBlocks }, () => ({
      id: crypto.randomUUID(),
      parentId: null,
      assumptionId: crypto.randomUUID(),
      endId: null,
    })),
  };
  expect(() => insertFitchProofStep(allBlocks, 0, null, true)).toThrow('subproof count');
});

test('starting and inserting premises copy formulas once and keep authoritative statement IDs', () => {
  const id = crypto.randomUUID();
  const definition = { ...derivationDefinition, premises: [{ id, formula: 'P' }] };
  const proof = startFitchProof(definition);
  definition.premises[0]!.formula = 'Q';
  expect(proof.steps[0]).toMatchObject({ kind: 'premise', premiseId: id, formula: 'P' });
  const next = insertFitchPremise(proof, 1);
  expect(next.steps[1]).toMatchObject({ kind: 'premise', premiseId: null, blockId: null });
});
