import { expect, test } from 'vitest';
import { PROOF_LIMITS, type FitchProof } from '@logiclab/contracts';
import { checkProof } from '@logiclab/logic-engine/proof';
import { derivationDefinition } from '../../../../test/derivation';
import {
  startReference,
  insertReferenceStep,
  insertReferencePremise,
  moveReferenceStep,
  removeReferenceStep,
  removeReferenceSubproof,
  referenceDepth,
  referenceSubtree,
  uniqueReferenceIds,
} from './reference-editor';

function fixture() {
  let proof = startReference(derivationDefinition);
  proof = insertReferenceStep(proof, 0, null, true);
  const block = proof.blocks[0]!;
  proof.steps[0]!.formula = 'P';
  proof = { ...proof, blocks: [{ ...block, endId: proof.steps[0]!.id }] };
  proof = insertReferenceStep(proof, 1, null);
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
  const report = checkProof({
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
  const inserted = insertReferenceStep(original, 1, block);
  expect(inserted.steps[2]).toEqual(original.steps[1]);
  const moved = moveReferenceStep(inserted, 1, 1);
  expect(moved.steps[1]).toEqual(original.steps[1]);
  expect(moved.blocks[0]!.endId).toBe(id);
  // Deleting a cited inference also preserves incoming line references.
  const root = insertReferenceStep(original, 2, null);
  const second = root.steps[2]!;
  if (second.kind !== 'inference') throw new Error('Expected inference');
  root.steps[2] = { ...second, lineReferences: [root.steps[1]!.id] };
  const removed = removeReferenceStep(root, 1);
  expect(removed.steps[1]).toEqual(root.steps[2]);
  expect(() => removeReferenceStep(root, 0)).toThrow('entire subproof');
  expect(original.steps).toHaveLength(2);
});

test('subproof deletion removes nested scopes only and preserves outside citations', () => {
  let proof = fixture();
  const parent = proof.blocks[0]!.id;
  proof = insertReferenceStep(proof, 1, parent, true);
  const child = proof.blocks[1]!.id;
  expect(referenceSubtree(proof, parent)).toEqual(new Set([parent, child]));
  const result = removeReferenceSubproof(proof, parent);
  expect(result.blocks).toEqual([]);
  expect(result.steps).toHaveLength(1);
  expect(result.steps[0]).toEqual(proof.steps[2]);
});

test('missing or cyclic scopes fail bounded insertion without repairing the saved proof', () => {
  const proof = fixture();
  const block = proof.blocks[0]!;
  const cyclic = { ...proof, blocks: [{ ...block, parentId: block.id }] };
  expect(referenceDepth(cyclic, block.id)).toBeNull();
  expect(() => insertReferenceStep(cyclic, 1, block.id, true)).toThrow('valid parent chain');
  expect(referenceDepth(proof, crypto.randomUUID())).toBeNull();
  expect(() => insertReferenceStep(proof, -1, null)).toThrow('insertion position');
});

test('step/block collisions disable ambiguous editing rather than silently assigning new IDs', () => {
  const proof = fixture();
  const duplicate = { ...proof, steps: [proof.steps[0]!, proof.steps[0]!] };
  expect(uniqueReferenceIds(duplicate)).toBe(false);
  expect(() => insertReferenceStep(duplicate, 1, null)).toThrow('duplicate');
  expect(
    uniqueReferenceIds({ ...proof, blocks: [{ ...proof.blocks[0]!, id: proof.steps[0]!.id }] }),
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
  expect(() => insertReferenceStep(full, full.steps.length, null)).toThrow('line limit');
  let nested = empty;
  let parent: string | null = null;
  for (let index = 0; index < PROOF_LIMITS.maxBlockDepth; index++) {
    nested = insertReferenceStep(nested, nested.steps.length, parent, true);
    parent = nested.blocks.at(-1)!.id;
  }
  expect(referenceDepth(nested, parent)).toBe(PROOF_LIMITS.maxBlockDepth);
  expect(() => insertReferenceStep(nested, nested.steps.length, parent, true)).toThrow(
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
  expect(() => insertReferenceStep(allBlocks, 0, null, true)).toThrow('subproof count');
});

test('starting and inserting premises copy formulas once and keep authoritative statement IDs', () => {
  const id = crypto.randomUUID();
  const definition = { ...derivationDefinition, premises: [{ id, formula: 'P' }] };
  const proof = startReference(definition);
  definition.premises[0]!.formula = 'Q';
  expect(proof.steps[0]).toMatchObject({ kind: 'premise', premiseId: id, formula: 'P' });
  const next = insertReferencePremise(proof, 1);
  expect(next.steps[1]).toMatchObject({ kind: 'premise', premiseId: null, blockId: null });
});
