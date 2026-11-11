import { startFitchProof } from '../../../features/proof/helpers/fitch-editor';
import { startDependencyProof } from '../../../features/proof/dependency/editor';
import { startTreeProof } from '../../../features/proof/tree/editor';
import type { AuthoringDerivationDefinition } from './problem-editor';

/** Called only for first entry or confirmed restart. Preserve statement, rule labels and explanation. */
export function withFreshReference(
  definition: AuthoringDerivationDefinition,
): AuthoringDerivationDefinition {
  switch (definition.format) {
    case 'fitch':
      return { ...definition, referenceProof: startFitchProof(definition) };
    case 'dependency':
      return { ...definition, referenceProof: startDependencyProof(definition.premises) };
    case 'tree':
      return { ...definition, referenceProof: startTreeProof(definition.conclusion) };
  }
}
