import type { SavedDerivationContent } from '@logiclab/contracts/saved-student-work';
import { validateDerivationAnswer, evaluateDerivationAnswer } from './derivation-response';
import { validateDependencyAnswer, evaluateDependencyAnswer } from './dependency-response';

/** The pinned server format selects validation, never a student-controlled replacement format. */
export function validateProofAnswer(
  content: Pick<SavedDerivationContent, 'format'>,
  value: unknown,
) {
  return content.format === 'dependency'
    ? validateDependencyAnswer(value)
    : validateDerivationAnswer(value);
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
  return content.format === 'dependency'
    ? evaluateDependencyAnswer({ ...authoritative, content }, value)
    : evaluateDerivationAnswer({ ...authoritative, content }, value);
}
