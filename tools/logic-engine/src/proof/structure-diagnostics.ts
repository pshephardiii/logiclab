import { PROOF_LIMITS, type ProofDiagnostic } from '@logiclab/contracts';

/** Reserve a diagnostic for overflow rather than returning a successful partial analysis. */
export function structureDiagnostics() {
  const items: ProofDiagnostic[] = [];
  let exhausted = false;
  return {
    add(diagnostic: ProofDiagnostic) {
      if (items.length < PROOF_LIMITS.maxDiagnostics) items.push(diagnostic);
      else exhausted = true;
    },
    get items() {
      return items;
    },
    get exhausted() {
      return exhausted;
    },
    get limited() {
      return exhausted || items.some((item) => item.code === 'RESOURCE_LIMIT');
    },
    result(): ProofDiagnostic[] {
      return exhausted
        ? [
            ...items.slice(0, PROOF_LIMITS.maxDiagnostics - 1),
            { code: 'RESOURCE_LIMIT', message: 'Proof diagnostic limit exceeded.' },
          ]
        : [...items];
    },
  };
}

export type StructureDiagnostics = ReturnType<typeof structureDiagnostics>;
