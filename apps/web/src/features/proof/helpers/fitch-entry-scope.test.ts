import { expect, test } from 'vitest';
import { startFitchProof, insertFitchProofStep } from './fitch-editor';
import { resumedFitchScope, fitchScopeEndpoint } from './fitch-entry-scope';

function nested() {
  let proof = startFitchProof({ premises: [] });
  proof = insertFitchProofStep(proof, 0, null, true);
  proof = insertFitchProofStep(proof, 1, proof.blocks[0]!.id, true);
  proof = insertFitchProofStep(proof, 2, proof.blocks[1]!.id);
  return proof;
}

test('closing uses the latest direct confirmed line and does not close an ancestor with an open child', () => {
  const proof = nested();
  const before = structuredClone(proof);
  const [outer, inner] = proof.blocks;
  expect(fitchScopeEndpoint(proof, inner!.id, null)?.id).toBe(proof.steps[2]!.id);
  expect(fitchScopeEndpoint(proof, outer!.id, null)).toBeNull();
  expect(fitchScopeEndpoint(proof, inner!.id, proof.steps[2]!.id)?.id).toBe(proof.steps[1]!.id);
  expect(fitchScopeEndpoint(proof, inner!.id, 'missing')).toBeNull();
  expect(proof).toEqual(before);
  inner!.endId = proof.steps[2]!.id;
  expect(fitchScopeEndpoint(proof, inner!.id, null)).toBeNull();
  expect(fitchScopeEndpoint(proof, outer!.id, null)?.id).toBe(proof.steps[0]!.id);
});

test('resuming follows the last line to its innermost open ancestor and handles closed/root scopes', () => {
  const proof = nested();
  expect(resumedFitchScope(proof)).toBe(proof.blocks[1]!.id);
  proof.blocks[1]!.endId = proof.steps[2]!.id;
  expect(resumedFitchScope(proof)).toBe(proof.blocks[0]!.id);
  proof.blocks[0]!.endId = proof.steps[0]!.id;
  expect(resumedFitchScope(proof)).toBeNull();
  expect(resumedFitchScope(null)).toBeNull();
  expect(fitchScopeEndpoint(proof, null, null)).toBeNull();
});

test('cyclic and missing ancestry do not become editable or closable scopes', () => {
  const proof = nested();
  proof.blocks[0]!.parentId = proof.blocks[1]!.id;
  expect(resumedFitchScope(proof)).toBeNull();
  expect(fitchScopeEndpoint(proof, proof.blocks[1]!.id, null)).toBeNull();
  proof.blocks[0]!.parentId = 'missing';
  expect(resumedFitchScope(proof)).toBeNull();
  expect(fitchScopeEndpoint(proof, proof.blocks[1]!.id, null)).toBeNull();
});
