import type { FitchProof } from '../proof/work.ts';

/** Student-owned proof draft; contains no statement, permissions, reference or checker report. */
export type FitchDerivationAnswer = { type: 'derivation'; proof: FitchProof };
