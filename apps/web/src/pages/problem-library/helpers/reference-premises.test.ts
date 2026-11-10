import { expect, test } from 'vitest';
import type { DependencyDerivationDefinition } from '@logiclab/contracts/dependency-derivation';
import { referencePremisesMatch } from './reference-premises';
const make = (): DependencyDerivationDefinition => ({
  type: 'derivation',
  definitionVersion: 1,
  format: 'dependency',
  checkerVersion: 1,
  ruleCatalogVersion: 1,
  premises: [{ id: 'source', formula: '[P -> Q]' }],
  conclusion: 'Q',
  rules: [],
  referenceProof: {
    format: 'dependency',
    proofVersion: 1,
    steps: [
      {
        id: 'line',
        kind: 'premise',
        premiseId: 'source',
        formula: 'P → Q',
        dependencies: ['line'],
      },
    ],
  },
});
test('matches statement identities and parsed formulas across equivalent notation without checking inference steps', () => {
  const d = make();
  expect(referencePremisesMatch(d)).toBe(true);
  d.referenceProof!.steps.push({
    id: 'unfinished',
    kind: 'inference',
    formula: '',
    ruleId: null,
    dependencies: [],
    discharges: [],
    lineReferences: [],
  });
  expect(referencePremisesMatch(d)).toBe(true);
});
test('detects missing, foreign, changed and blank extra premises while retaining the draft', () => {
  for (const change of [
    (d: DependencyDerivationDefinition) => d.premises.push({ id: 'extra', formula: 'P' }),
    (d: DependencyDerivationDefinition) => {
      d.premises[0]!.formula = 'P';
    },
    (d: DependencyDerivationDefinition) => {
      d.referenceProof!.steps.push({
        id: 'blank',
        kind: 'premise',
        premiseId: null,
        formula: '',
        dependencies: ['blank'],
      });
    },
  ]) {
    const d = make();
    change(d);
    const before = structuredClone(d);
    expect(referencePremisesMatch(d)).toBe(false);
    expect(d).toEqual(before);
  }
});
