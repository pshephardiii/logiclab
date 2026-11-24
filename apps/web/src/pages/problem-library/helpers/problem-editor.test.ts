import { expect, test } from 'vitest';
import { derivationDraft } from '../../../../test/derivation';
import { initialProblemFields } from './problem-editor';
import { withFreshReference } from './fresh-reference';

test('fresh derivations opt into catalog 2 without granting rules or fabricating references', () => {
  const fields = initialProblemFields(null);
  expect(fields.derivation).toMatchObject({
    format: 'fitch',
    ruleCatalogVersion: 2,
    formulaGroupingVersion: 1,
    rules: [],
    referenceProof: null,
  });
  expect(withFreshReference(fields.derivation).referenceProof?.proofVersion).toBe(2);
  expect(
    withFreshReference({ ...fields.derivation, format: 'dependency', referenceProof: null })
      .referenceProof?.proofVersion,
  ).toBe(2);
});

test('loading and restarting an existing derivation preserve its saved catalog and private fields', () => {
  const before = structuredClone(derivationDraft);
  const fields = initialProblemFields(derivationDraft);
  expect(fields.derivation).toEqual(derivationDraft.definition);
  expect(fields.derivation.ruleCatalogVersion).toBe(1);
  expect(withFreshReference(fields.derivation).referenceProof?.proofVersion).toBe(1);
  fields.derivation.rules[0]!.label = 'Local label';
  expect(derivationDraft).toEqual(before);
});
