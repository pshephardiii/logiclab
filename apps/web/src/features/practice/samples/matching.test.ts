import { expect, test } from 'vitest';
import { createFitchSample, createDependencySample } from './derivations';
import { createTruthTreeSample } from './truth-trees';
import { matchesSampleStatement } from './matching';

test('matches the entire pinned problem, not the current attempted proof/tree', () => {
  const sample = createFitchSample().statement;
  expect(matchesSampleStatement(structuredClone(sample), sample)).toBe(true);
  const changes = [
    { ...sample, conclusion: 'R' },
    { ...sample, premises: [] },
    { ...sample, premises: [{ ...sample.premises[0]!, formula: 'R' }] },
    {
      ...sample,
      premises: [{ ...sample.premises[0]!, id: '00000000-0000-4000-8000-000000000099' }],
    },
    { ...sample, rules: [] },
    { ...sample, rules: [...sample.rules].reverse() },
    { ...sample, rules: sample.rules.map((rule) => ({ ...rule, label: 'Different label' })) },
    { ...sample, ruleCatalogVersion: 1 as const },
    { ...sample, formulaGroupingVersion: undefined },
    createDependencySample().statement,
    createTruthTreeSample().statement,
  ];
  for (const changed of changes) expect(matchesSampleStatement(changed, sample)).toBe(false);
  const tree = createTruthTreeSample().statement;
  expect(matchesSampleStatement(structuredClone(tree), tree)).toBe(true);
  expect(matchesSampleStatement({ ...tree, conclusion: 'R' }, tree)).toBe(false);
});
