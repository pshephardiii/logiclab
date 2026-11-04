import type { DependencyDerivationContent } from '@logiclab/contracts/dependency-derivation';
import {
  dependencyDerivationAnswerSchema,
  type DependencyDerivationAnswer,
} from '@logiclab/contracts/dependency-derivation-work';
import {
  derivationEvaluationEvidenceSchema,
  type DerivationEvaluationEvidence,
} from '@logiclab/contracts/derivation-work';
import { checkDependencyProof } from '@logiclab/logic-engine/proof';
import { validateDependencyContent } from '../problem/derivation/dependency/authoring';
import { StudentWorkError } from './errors';

/** Transport validation alone: incomplete formulas, annotations and citations remain draft work. */
export function validateDependencyAnswer(value: unknown): DependencyDerivationAnswer {
  const parsed = dependencyDerivationAnswerSchema.safeParse(value);
  if (!parsed.success) throw new StudentWorkError('invalid_answer');
  return parsed.data;
}

/**
 * Caller owns enrollment/workspace/disclosure checks and loads the pinned authoritative content.
 * Neither student-supplied statements nor private references enter this evaluation. No writes or grades.
 */
export function evaluateDependencyAnswer(
  authoritative: { itemId: string; problemVersionId: string; content: DependencyDerivationContent },
  value: unknown,
): DerivationEvaluationEvidence {
  const content = validateDependencyContent(authoritative.content);
  const answer = validateDependencyAnswer(value);
  return derivationEvaluationEvidenceSchema.parse({
    evaluationVersion: 'derivation_v1',
    type: 'derivation',
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    report: checkDependencyProof({
      problem: {
        ruleCatalogVersion: content.ruleCatalogVersion,
        premises: content.premises,
        conclusion: content.conclusion,
        permittedRuleIds: content.rules.map((rule) => rule.id),
      },
      proof: answer.proof,
    }),
  });
}
