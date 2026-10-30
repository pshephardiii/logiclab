import { PROOF_LIMITS } from '@logiclab/contracts';

export class ProofBudgetExceeded extends Error {
  constructor(
    message = 'Proof checking work budget exceeded.',
    readonly position?: number,
    readonly stepIndex?: number,
  ) {
    super(message);
  }
}

/** Deterministic work units, not elapsed-time cancellation or an instruction counter. */
export function proofBudget() {
  let remaining = PROOF_LIMITS.maxCheckWork;
  return {
    spend(units: number) {
      remaining -= units;
      if (remaining < 0) throw new ProofBudgetExceeded();
    },
  };
}
export type ProofBudget = ReturnType<typeof proofBudget>;
