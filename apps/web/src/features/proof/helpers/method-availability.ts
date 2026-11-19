import { isProofFormatAvailable } from '@logiclab/contracts';

/** Display eligibility only; historical transport stays broader and server admission is authoritative. */
export function isProblemMethodAvailable(definition: { type: string; format?: string }): boolean {
  if (definition.type === 'truth_tree') return false;
  return definition.type !== 'derivation' || isProofFormatAvailable(definition.format ?? '');
}

/** Library construction is ready before assigned/practice tree controls are enabled. */
export function isProblemAuthoringAvailable(definition: {
  type: string;
  format?: string;
}): boolean {
  return definition.type === 'truth_tree' || isProblemMethodAvailable(definition);
}
