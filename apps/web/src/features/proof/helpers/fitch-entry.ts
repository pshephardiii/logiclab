import type { FitchProof } from '@logiclab/contracts';
import { insertFitchProofStep } from './fitch-editor';

export type FitchEntry = { base: FitchProof; draft: FitchProof; index: number };

/** A staged step/block stays local until Add line; earlier work and identities are untouched. */
export function createFitchEntry(
  proof: FitchProof,
  before: string | null,
  scope: string | null,
  subproof = false,
): FitchEntry {
  const index =
    before === null ? proof.steps.length : proof.steps.findIndex((step) => step.id === before);

  return { base: proof, draft: insertFitchProofStep(proof, index, scope, subproof), index };
}
