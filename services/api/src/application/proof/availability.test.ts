import { AVAILABLE_PROOF_FORMATS, isProofFormatAvailable } from '@logiclab/contracts';
import { treeProofSchema } from '@logiclab/contracts';
import { treeDerivationDefinitionSchema } from '@logiclab/contracts/tree-derivation';
import { treeDefinitionFixture } from '../../../test/derivation-fixture';
import { libraryProblemDefinition, libraryReferenceCheck } from '../problem/library-definition';
import { assertProofFormatAvailable, ProofMethodUnavailableError } from './availability';

test('new-work availability explicitly admits Fitch and dependency formats', () => {
  expect(AVAILABLE_PROOF_FORMATS).toEqual(['fitch', 'dependency']);
  for (const format of AVAILABLE_PROOF_FORMATS) {
    expect(isProofFormatAvailable(format)).toBe(true);
    expect(() => assertProofFormatAvailable(format)).not.toThrow();
  }
});

test.each(['tree', '', 'semantic_tableau', 'future_format', 'Fitch'])(
  'new-work policy rejects unavailable or unknown format %j',
  (format) => {
    expect(isProofFormatAvailable(format)).toBe(false);
    expect(() => assertProofFormatAvailable(format)).toThrow(ProofMethodUnavailableError);
  },
);

test('unavailable natural-deduction trees retain transport, historical validation and checker support', () => {
  const definition = treeDefinitionFixture();
  const before = structuredClone(definition);
  expect(treeDerivationDefinitionSchema.parse(definition)).toEqual(definition);
  expect(treeProofSchema.parse(definition.referenceProof)).toEqual(definition.referenceProof);
  expect(libraryProblemDefinition(definition)).toEqual(definition);
  const check = libraryReferenceCheck(definition);
  expect(check.status).toBe('checked');
  if (check.status !== 'checked') throw new Error('Expected a retained reference check');
  expect(check.report.status).toBe('accepted');
  expect(() => assertProofFormatAvailable(definition.format)).toThrow(ProofMethodUnavailableError);
  expect(definition).toEqual(before);
});
