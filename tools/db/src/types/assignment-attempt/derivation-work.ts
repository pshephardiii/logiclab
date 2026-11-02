import type { FitchProof } from '../proof/work.ts';

/** Student-owned proof draft; contains no statement, permissions, reference or checker report. */
export type DerivationAnswer = { type: 'derivation'; proof: FitchProof };
