import { expect, test } from 'vitest';
import { startNaturalDeductionTreeProof } from './editor';
import {
  createConnectedNaturalDeductionTreeEntry,
  confirmNaturalDeductionTreeEntry,
  naturalDeductionTreeConnectionSlots,
} from './connections';

test('guided support is staged and confirmed atomically without changing the original graph', () => {
  const proof = startNaturalDeductionTreeProof('P');
  const parent = proof.nodes[0]!;
  if (parent.kind !== 'inference') throw new Error('Expected inference');
  parent.ruleId = 'reiteration';
  const before = structuredClone(proof);
  const entry = createConnectedNaturalDeductionTreeEntry(proof, parent.id, 'premise', 'support', [
    { id: 'reiteration' },
  ]);
  expect(proof).toEqual(before);
  expect(entry.draft.nodes[0]).toEqual(parent);
  const connected = confirmNaturalDeductionTreeEntry(entry);
  expect(connected.nodes[0]).toMatchObject({ lineReferences: [entry.draft.nodes[1]!.id] });
  expect(connected.rootId).toBe(proof.rootId);
  expect(proof).toEqual(before);
  expect(entry.draft.nodes[0]).toEqual(parent);
});

test('connection capabilities require an enabled rule and do not overwrite partial or completed slots', () => {
  const proof = startNaturalDeductionTreeProof('P -> P');
  const parent = proof.nodes[0]!;
  if (parent.kind !== 'inference') throw new Error('Expected inference');
  parent.ruleId = 'implication_introduction';
  expect(naturalDeductionTreeConnectionSlots(proof, parent.id, [])).toEqual({
    support: -1,
    branch: -1,
  });
  expect(() =>
    createConnectedNaturalDeductionTreeEntry(proof, 'missing', 'assumption', 'branch', [
      { id: parent.ruleId! },
    ]),
  ).toThrow('available connection slot');
  parent.branches = [{ rootId: null, assumptionFormula: 'P', assumptionIds: [] }];
  expect(() =>
    createConnectedNaturalDeductionTreeEntry(proof, parent.id, 'assumption', 'branch', [
      { id: parent.ruleId! },
    ]),
  ).toThrow('available connection slot');
  parent.branches[0]!.rootId = 'retained-child';
  expect(
    naturalDeductionTreeConnectionSlots(proof, parent.id, [{ id: parent.ruleId! }]).branch,
  ).toBe(-1);
});

test('a second case branch preserves existing branch data and copies explicit discharge selections', () => {
  const proof = startNaturalDeductionTreeProof('R');
  const parent = proof.nodes[0]!;
  if (parent.kind !== 'inference') throw new Error('Expected inference');
  parent.ruleId = 'or_elimination';
  parent.branches = [
    { rootId: 'first-case', assumptionFormula: 'P', assumptionIds: ['first-assumption'] },
  ];
  const before = structuredClone(proof);
  const firstBranch = structuredClone(parent.branches[0]!);
  const entry = createConnectedNaturalDeductionTreeEntry(proof, parent.id, 'assumption', 'branch', [
    { id: parent.ruleId },
  ]);
  expect(entry.connection!.slot).toBe(1);
  entry.connection!.assumptionFormula = 'Q';
  entry.connection!.assumptionIds = [entry.draft.nodes[1]!.id];
  const connected = confirmNaturalDeductionTreeEntry(entry);
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
  const proof = startNaturalDeductionTreeProof('P');
  const parent = proof.nodes[0]!;
  if (parent.kind !== 'inference') throw new Error('Expected inference');
  parent.ruleId = 'reiteration';
  const entry = createConnectedNaturalDeductionTreeEntry(
    proof,
    parent.id,
    'assumption',
    'support',
    [{ id: 'reiteration' }],
  );
  const target = entry.draft.nodes[0]!;
  if (target.kind !== 'inference') throw new Error('Expected inference');
  target.lineReferences = ['retained-child'];
  const before = structuredClone(entry.draft);
  expect(() => confirmNaturalDeductionTreeEntry(entry)).toThrow('already filled');
  expect(entry.draft).toEqual(before);
  entry.draft = { ...entry.draft, nodes: entry.draft.nodes.slice(1) };
  expect(() => confirmNaturalDeductionTreeEntry(entry)).toThrow('target inference is unavailable');
});
