import type { DependencyProof } from '../proof/dependency-work.ts';

/** Exact student-owned JSON, staged separately from the live attempt-answer union. */
export type DependencyDerivationAnswer = { type: 'derivation'; proof: DependencyProof };
