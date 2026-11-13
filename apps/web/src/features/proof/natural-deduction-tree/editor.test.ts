import { expect, test } from 'vitest';
import { PROOF_LIMITS, type NaturalDeductionTreeProof } from '@logiclab/contracts';
import { naturalDeductionTreeDerivationDefinition } from '../../../../test/derivation';
import {
  startNaturalDeductionTreeProof,
  appendNaturalDeductionTreeNode,
  removeNaturalDeductionTreeNode,
  uniqueNaturalDeductionTreeIds,
  naturalDeductionTreePreviewLayout,
} from './editor';

test('starting and appending create stable distinct identities without altering existing work', () => {
  const proof = startNaturalDeductionTreeProof('P -> P');
  expect(proof.nodes[0]).toMatchObject({
    kind: 'inference',
    formula: 'P -> P',
    ruleId: null,
    lineReferences: [],
    branches: [],
  });
  expect(proof.rootId).toBe(proof.nodes[0]!.id);
  const before = structuredClone(proof);
  const assumption = appendNaturalDeductionTreeNode(proof, 'assumption');
  const premise = appendNaturalDeductionTreeNode(assumption, 'premise');
  expect(premise.nodes[1]).toMatchObject({ kind: 'assumption', formula: '' });
  expect(premise.nodes[2]).toMatchObject({ kind: 'premise', formula: '', premiseId: null });
  expect(new Set(premise.nodes.map((node) => node.id)).size).toBe(3);
  expect(premise.rootId).toBe(proof.rootId);
  expect(proof).toEqual(before);
});

test('deleting an assumption or the root preserves unresolved incoming identities', () => {
  const proof = structuredClone(naturalDeductionTreeDerivationDefinition.referenceProof!);
  const before = structuredClone(proof);
  const removed = removeNaturalDeductionTreeNode(proof, proof.nodes[0]!.id);
  expect(removed.nodes[0]).toEqual(proof.nodes[1]);
  expect(removed.rootId).toBe(proof.rootId);
  const noRoot = removeNaturalDeductionTreeNode(proof, proof.rootId!);
  expect(noRoot.rootId).toBe(proof.rootId);
  expect(naturalDeductionTreePreviewLayout(noRoot)).toEqual({ order: [], unattached: 1 });
  expect(proof).toEqual(before);
});

test('duplicate identities and node limits prevent unsafe appends', () => {
  const proof = startNaturalDeductionTreeProof('P');
  const duplicate = { ...proof, nodes: [proof.nodes[0]!, proof.nodes[0]!] };
  expect(uniqueNaturalDeductionTreeIds(duplicate)).toBe(false);
  expect(() => appendNaturalDeductionTreeNode(duplicate, 'assumption')).toThrow(/duplicate/);
  let full = proof;
  while (full.nodes.length < PROOF_LIMITS.maxSteps)
    full = appendNaturalDeductionTreeNode(full, 'assumption');
  expect(() => appendNaturalDeductionTreeNode(full, 'inference')).toThrow(/limit/);
});

test('preview layout is bottom-up, independent of array ordering and tolerates missing links', () => {
  const proof = structuredClone(naturalDeductionTreeDerivationDefinition.referenceProof!);
  expect(naturalDeductionTreePreviewLayout(proof)).toEqual({ order: [0, 1], unattached: 0 });
  proof.nodes.reverse();
  expect(naturalDeductionTreePreviewLayout(proof)).toEqual({ order: [1, 0], unattached: 0 });
  const partial = removeNaturalDeductionTreeNode(proof, proof.nodes[1]!.id);
  expect(naturalDeductionTreePreviewLayout(partial)).toEqual({ order: [0], unattached: 0 });
  const detached = appendNaturalDeductionTreeNode(proof, 'assumption');
  expect(naturalDeductionTreePreviewLayout(detached)).toEqual({ order: [1, 0], unattached: 1 });
});

test.each(['cycle', 'shared', 'duplicate'] as const)(
  'preview refuses %s without changing the draft',
  (kind) => {
    const proof = structuredClone(naturalDeductionTreeDerivationDefinition.referenceProof!);
    const root = proof.nodes[1]!;
    if (root.kind !== 'inference') throw Error();
    if (kind === 'cycle') root.lineReferences = [root.id];
    else if (kind === 'shared') root.lineReferences = [proof.nodes[0]!.id];
    else proof.nodes.push({ ...proof.nodes[0]! });
    const before = structuredClone(proof);
    expect(naturalDeductionTreePreviewLayout(proof)).toBeNull();
    expect(proof).toEqual(before);
  },
);

test('maximum-depth layout uses a bounded iterative walk', () => {
  const proof: NaturalDeductionTreeProof = {
    proofVersion: 1,
    format: 'tree',
    rootId: '0',
    nodes: Array.from({ length: PROOF_LIMITS.maxSteps }, (_, index) => ({
      kind: 'inference',
      id: String(index),
      formula: 'P',
      ruleId: 'reiteration',
      lineReferences: index === PROOF_LIMITS.maxSteps - 1 ? [] : [String(index + 1)],
      branches: [],
    })),
  };
  expect(naturalDeductionTreePreviewLayout(proof)?.order).toHaveLength(PROOF_LIMITS.maxSteps);
});
