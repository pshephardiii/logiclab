import { ProblemType } from '@logiclab/contracts/problem-type';
import { isProofFormatAvailable } from '@logiclab/contracts';

/** Display eligibility only; historical transport stays broader and server admission is authoritative. */
export function isProblemMethodAvailable(definition: { type: string; format?: string }): boolean {
  return (
    definition.type !== ProblemType.Derivation || isProofFormatAvailable(definition.format ?? '')
  );
}
