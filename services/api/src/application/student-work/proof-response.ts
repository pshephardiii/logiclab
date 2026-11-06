import type { SavedDerivationContent } from '@logiclab/contracts/saved-student-work';
import { validateFitchAnswer, evaluateFitchAnswer } from './derivation-response';
import { validateDependencyAnswer, evaluateDependencyAnswer } from './dependency-response';
import { validateTreeAnswer, evaluateTreeAnswer } from './tree-response';

/** The pinned server format selects validation, never a student-controlled replacement format. */
export function validateProofAnswer(
  content: Pick<SavedDerivationContent, 'format'>,
  value: unknown,
) {
  if (content.format === 'tree') return validateTreeAnswer(value);

  return content.format === 'dependency'
    ? validateDependencyAnswer(value)
    : validateFitchAnswer(value);
}

export function evaluateProofAnswer(
  authoritative: {
    itemId: string;
    problemVersionId: string;
    content: SavedDerivationContent;
  },
  value: unknown,
) {
  const content = authoritative.content;

  if (content.format === 'tree') return evaluateTreeAnswer({ ...authoritative, content }, value);

  return content.format === 'dependency'
    ? evaluateDependencyAnswer({ ...authoritative, content }, value)
    : evaluateFitchAnswer({ ...authoritative, content }, value);
}
