import type { FitchProof } from '@logiclab/contracts';
import { expect, test } from 'vitest';
import { fitchLineRange } from './fitch-line-range';

function fixture(): FitchProof {
  return {
    format: 'fitch',
    proofVersion: 1,
    blocks: [],
    steps: Array.from({ length: 8 }, (_, index) => ({
      id: `line${index + 1}`,
      kind: 'inference',
      blockId: null,
      formula: 'P',
      ruleId: 'reiteration',
      lineReferences: index ? [`line${index}`] : [],
      subproofReferences: [],
    })),
  };
}

test('reversed endpoints delete exactly the inclusive range and preserve all retained identities/citations', () => {
  const proof = fixture();
  const before = structuredClone(proof);
  const range = fitchLineRange(proof, 'line7', 'line5')!;
  expect(range.error).toBeNull();
  expect(range.steps.map((step) => step.id)).toEqual(['line5', 'line6', 'line7']);
  expect(range.next.steps).toEqual([...proof.steps.slice(0, 4), proof.steps[7]]);
  expect(range.next.steps.at(-1)).toMatchObject({ lineReferences: ['line7'] });
  expect(proof).toEqual(before);
});

test('an assumption requires selecting its entire nested subproof, without expanding into unselected lines', () => {
  const proof = fixture();
  proof.steps[1] = { kind: 'assumption', id: 'line2', formula: 'P', blockId: 'outer' };
  proof.steps[2] = { kind: 'assumption', id: 'line3', formula: 'Q', blockId: 'inner' };
  proof.steps[3]!.blockId = 'inner';
  proof.steps[4]!.blockId = 'outer';
  proof.blocks = [
    { id: 'outer', parentId: null, assumptionId: 'line2', endId: 'line5' },
    { id: 'inner', parentId: 'outer', assumptionId: 'line3', endId: 'line4' },
  ];
  const before = structuredClone(proof);
  expect(fitchLineRange(proof, 'line2', 'line4')!.error).toMatch(/entire subproof/);
  expect(fitchLineRange(proof, 'line3', 'line3')!.error).toMatch(/entire subproof/);
  const inner = fitchLineRange(proof, 'line3', 'line4')!;
  expect(inner.error).toBeNull();
  expect(inner.next.blocks).toEqual([proof.blocks[0]]);
  const outer = fitchLineRange(proof, 'line5', 'line2')!;
  expect(outer.error).toBeNull();
  expect(outer.next.blocks).toEqual([]);
  expect(outer.next.steps.map((step) => step.id)).toEqual(['line1', 'line6', 'line7', 'line8']);
  expect(proof).toEqual(before);
});

test('deleting an interior/endpoint retains the block and its unresolved endpoint for explicit repair', () => {
  const proof = fixture();
  proof.steps[1] = { kind: 'assumption', id: 'line2', formula: 'P', blockId: 'block' };
  proof.steps[2]!.blockId = 'block';
  proof.blocks = [{ id: 'block', parentId: null, assumptionId: 'line2', endId: 'line3' }];
  const range = fitchLineRange(proof, 'line3', 'line3')!;
  expect(range.error).toBeNull();
  expect(range.next.blocks).toEqual(proof.blocks);
});

test('full deletion clears lines/blocks while invalid endpoints and ambiguous identities cannot select a range', () => {
  const proof = fixture();
  proof.blocks = [{ id: 'orphan', parentId: null, assumptionId: 'missing', endId: null }];
  expect(fitchLineRange(proof, 'line1', 'line8')!.next).toMatchObject({ steps: [], blocks: [] });
  expect(fitchLineRange(proof, 'line1', 'missing')).toBeNull();
  proof.steps[1]!.id = 'line1';
  expect(fitchLineRange(proof, 'line1', 'line8')).toBeNull();
});
