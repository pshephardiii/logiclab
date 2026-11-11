import { expect, test } from 'vitest';
import { startTreeProof } from './editor';
import { createConnectedTreeEntry, confirmTreeEntry, treeConnectionSlots } from './connections';

test('guided support is staged and confirmed atomically without changing the original graph', () => {
  const proof = startTreeProof('P');
  const parent = proof.nodes[0]!;
  if (parent.kind !== 'inference') throw new Error('Expected inference');
  parent.ruleId = 'reiteration';
  const before = structuredClone(proof);
  const entry = createConnectedTreeEntry(proof, parent.id, 'premise', 'support', [
    { id: 'reiteration' },
  ]);
  expect(proof).toEqual(before);
  expect(entry.draft.nodes[0]).toEqual(parent);
  const connected = confirmTreeEntry(entry);
  expect(connected.nodes[0]).toMatchObject({ lineReferences: [entry.draft.nodes[1]!.id] });
  expect(connected.rootId).toBe(proof.rootId);
  expect(proof).toEqual(before);
  expect(entry.draft.nodes[0]).toEqual(parent);
});

test('connection capabilities require an enabled rule and do not overwrite partial or completed slots', () => {
  const proof = startTreeProof('P -> P');
  const parent = proof.nodes[0]!;
  if (parent.kind !== 'inference') throw new Error('Expected inference');
  parent.ruleId = 'implication_introduction';
  expect(treeConnectionSlots(proof, parent.id, [])).toEqual({ support: -1, branch: -1 });
  expect(() =>
    createConnectedTreeEntry(proof, 'missing', 'assumption', 'branch', [{ id: parent.ruleId! }]),
  ).toThrow('available connection slot');
  parent.branches = [{ rootId: null, assumptionFormula: 'P', assumptionIds: [] }];
  expect(() =>
    createConnectedTreeEntry(proof, parent.id, 'assumption', 'branch', [{ id: parent.ruleId! }]),
  ).toThrow('available connection slot');
  parent.branches[0]!.rootId = 'retained-child';
  expect(treeConnectionSlots(proof, parent.id, [{ id: parent.ruleId! }]).branch).toBe(-1);
});

test('a second case branch preserves existing branch data and copies explicit discharge selections', () => {
  const proof = startTreeProof('R');
  const parent = proof.nodes[0]!;
  if (parent.kind !== 'inference') throw new Error('Expected inference');
  parent.ruleId = 'or_elimination';
  parent.branches = [
    { rootId: 'first-case', assumptionFormula: 'P', assumptionIds: ['first-assumption'] },
  ];
  const before = structuredClone(proof);
  const firstBranch = structuredClone(parent.branches[0]!);
  const entry = createConnectedTreeEntry(proof, parent.id, 'assumption', 'branch', [
    { id: parent.ruleId },
  ]);
  expect(entry.connection!.slot).toBe(1);
  entry.connection!.assumptionFormula = 'Q';
  entry.connection!.assumptionIds = [entry.draft.nodes[1]!.id];
  const connected = confirmTreeEntry(entry);
  const result = connected.nodes[0]!;
  if (result.kind !== 'inference') throw new Error('Expected inference');
  expect(result.branches).toEqual([
    firstBranch,
    {
      rootId: entry.draft.nodes[1]!.id,
      assumptionFormula: 'Q',
      assumptionIds: entry.connection!.assumptionIds,
    },
  ]);
  expect(result.branches[1]!.assumptionIds).not.toBe(entry.connection!.assumptionIds);
  expect(proof).toEqual(before);
});

test('confirmation refuses a missing parent or newly occupied target slot without modifying drafts', () => {
  const proof = startTreeProof('P');
  const parent = proof.nodes[0]!;
  if (parent.kind !== 'inference') throw new Error('Expected inference');
  parent.ruleId = 'reiteration';
  const entry = createConnectedTreeEntry(proof, parent.id, 'assumption', 'support', [
    { id: 'reiteration' },
  ]);
  const target = entry.draft.nodes[0]!;
  if (target.kind !== 'inference') throw new Error('Expected inference');
  target.lineReferences = ['retained-child'];
  const before = structuredClone(entry.draft);
  expect(() => confirmTreeEntry(entry)).toThrow('already filled');
  expect(entry.draft).toEqual(before);
  entry.draft = { ...entry.draft, nodes: entry.draft.nodes.slice(1) };
  expect(() => confirmTreeEntry(entry)).toThrow('target inference is unavailable');
});
