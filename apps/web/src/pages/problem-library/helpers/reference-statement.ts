import { parseProofFormula } from '@logiclab/logic-engine/proof';
import type { AuthoringDerivationDefinition } from './problem-editor';

/** Only entry into reference construction requires a complete, parseable statement. */
export function referenceStatementError(
  definition: Pick<AuthoringDerivationDefinition, 'premises' | 'conclusion'>,
): string | null {
  if (definition.premises.some((premise) => !premise.formula.trim())) {
    return 'Complete or remove blank premises before building the reference proof.';
  }

  for (const [index, premise] of definition.premises.entries()) {
    try {
      parseProofFormula(premise.formula);
    } catch (error) {
      return `Premise ${index + 1}: ${error instanceof Error ? error.message : 'Invalid formula.'}`;
    }
  }

  try {
    parseProofFormula(definition.conclusion);
  } catch (error) {
    return `Conclusion: ${error instanceof Error ? error.message : 'Invalid formula.'}`;
  }

  return null;
}
