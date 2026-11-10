import { expect, test } from 'vitest';
import type { DependencyProofStep } from '@logiclab/contracts';
import { dependencyAssumptionGuides } from './assumption-guides';

const assumption = (id: string): DependencyProofStep => ({
  kind: 'assumption',
  id,
  formula: 'P',
  dependencies: [id],
});
const line = (
  id: string,
  dependencies: string[] = [],
  discharges: [string, string][] = [],
): DependencyProofStep => ({
  kind: 'inference',
  id,
  formula: 'P',
  ruleId: null,
  dependencies,
  lineReferences: [],
  discharges: discharges.map(([assumptionId, conclusionId]) => ({ assumptionId, conclusionId })),
});

test('nested guides end at the cited subproof conclusions and reuse lanes for later assumptions', () => {
  const steps = [
    assumption('outer'),
    assumption('inner'),
    line('both', ['outer', 'inner']),
    line('inner-closed', ['outer'], [['inner', 'both']]),
    line('outer-closed', [], [['outer', 'inner-closed']]),
    assumption('next'),
  ];
  const before = structuredClone(steps);
  expect(dependencyAssumptionGuides(steps)).toEqual({
    lanes: 2,
    guides: [
      { id: 'outer', line: 1, start: 0, end: 3, lane: 0, closed: true },
      { id: 'inner', line: 2, start: 1, end: 2, lane: 1, closed: true },
      { id: 'next', line: 6, start: 5, end: 5, lane: 0, closed: false },
    ],
  });
  expect(steps).toEqual(before);
});

test('incomplete discharge stays open; dependency reuse remains visible without a scope lock', () => {
  expect(
    dependencyAssumptionGuides([
      assumption('a'),
      line('missing', [], [['a', 'absent']]),
      line('end'),
    ]).guides[0],
  ).toMatchObject({ start: 0, end: 2 });
  expect(
    dependencyAssumptionGuides([
      assumption('a'),
      line('closed', [], [['a', 'a']]),
      line('reuse', ['a']),
    ]).guides[0],
  ).toMatchObject({ start: 0, end: 2 });
  expect(dependencyAssumptionGuides([])).toEqual({ lanes: 0, guides: [] });
});
