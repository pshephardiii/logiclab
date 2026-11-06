import { expect, test } from 'vitest';
import { PROOF_LIMITS, type TreeProof } from '@logiclab/contracts';
import { treeDerivationDefinition } from '../../../../test/derivation';
import {
  startTreeProof,
  appendTreeNode,
  removeTreeNode,
  uniqueTreeIds,
  treePreviewLayout,
} from './editor';

test('starting and appending create stable distinct identities without altering existing work', () => {
  const proof = startTreeProof('P -> P');
  expect(proof.nodes[0]).toMatchObject({
    kind: 'inference',
    formula: 'P -> P',
    ruleId: null,
    lineReferences: [],
    branches: [],
  });
  expect(proof.rootId).toBe(proof.nodes[0]!.id);
  const before = structuredClone(proof);
  const assumption = appendTreeNode(proof, 'assumption');
  const premise = appendTreeNode(assumption, 'premise');
  expect(premise.nodes[1]).toMatchObject({ kind: 'assumption', formula: '' });
  expect(premise.nodes[2]).toMatchObject({ kind: 'premise', formula: '', premiseId: null });
  expect(new Set(premise.nodes.map((node) => node.id)).size).toBe(3);
  expect(premise.rootId).toBe(proof.rootId);
  expect(proof).toEqual(before);
});

test('deleting an assumption or the root preserves unresolved incoming identities', () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  const before = structuredClone(proof);
  const removed = removeTreeNode(proof, proof.nodes[0]!.id);
  expect(removed.nodes[0]).toEqual(proof.nodes[1]);
  expect(removed.rootId).toBe(proof.rootId);
  const noRoot = removeTreeNode(proof, proof.rootId!);
  expect(noRoot.rootId).toBe(proof.rootId);
  expect(treePreviewLayout(noRoot)).toEqual({ order: [], unattached: 1 });
  expect(proof).toEqual(before);
});

test('duplicate identities and node limits prevent unsafe appends', () => {
  const proof = startTreeProof('P');
  const duplicate = { ...proof, nodes: [proof.nodes[0]!, proof.nodes[0]!] };
  expect(uniqueTreeIds(duplicate)).toBe(false);
  expect(() => appendTreeNode(duplicate, 'assumption')).toThrow(/duplicate/);
  let full = proof;
  while (full.nodes.length < PROOF_LIMITS.maxSteps) full = appendTreeNode(full, 'assumption');
  expect(() => appendTreeNode(full, 'inference')).toThrow(/limit/);
});

test('preview layout is bottom-up, independent of array ordering and tolerates missing links', () => {
  const proof = structuredClone(treeDerivationDefinition.referenceProof!);
  expect(treePreviewLayout(proof)).toEqual({ order: [0, 1], unattached: 0 });
  proof.nodes.reverse();
  expect(treePreviewLayout(proof)).toEqual({ order: [1, 0], unattached: 0 });
  const partial = removeTreeNode(proof, proof.nodes[1]!.id);
  expect(treePreviewLayout(partial)).toEqual({ order: [0], unattached: 0 });
  const detached = appendTreeNode(proof, 'assumption');
  expect(treePreviewLayout(detached)).toEqual({ order: [1, 0], unattached: 1 });
});

test.each(['cycle', 'shared', 'duplicate'] as const)(
  'preview refuses %s without changing the draft',
  (kind) => {
    const proof = structuredClone(treeDerivationDefinition.referenceProof!);
    const root = proof.nodes[1]!;
    if (root.kind !== 'inference') throw Error();
    if (kind === 'cycle') root.lineReferences = [root.id];
    else if (kind === 'shared') root.lineReferences = [proof.nodes[0]!.id];
    else proof.nodes.push({ ...proof.nodes[0]! });
    const before = structuredClone(proof);
    expect(treePreviewLayout(proof)).toBeNull();
    expect(proof).toEqual(before);
  },
);

test('maximum-depth layout uses a bounded iterative walk', () => {
  const proof: TreeProof = {
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
  expect(treePreviewLayout(proof)?.order).toHaveLength(PROOF_LIMITS.maxSteps);
});
