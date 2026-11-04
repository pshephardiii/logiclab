import type { DependencyProof } from '../proof/dependency-work.ts';

/** Exact student-owned dependency JSON; no statement, reference, permissions or report. */
export type DependencyDerivationAnswer = { type: 'derivation'; proof: DependencyProof };
