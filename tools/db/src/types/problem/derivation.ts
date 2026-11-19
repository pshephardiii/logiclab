/** Stored JSON shares its schema-inferred contract type; this adds no runtime validation. */

export type { FitchDerivationDefinition } from '@logiclab/contracts/derivation';

export type {
  FitchProof as FitchReferenceProof,
  FitchProofStep as FitchDerivationProofStep,
} from '@logiclab/contracts';
