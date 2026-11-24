import { formulaGroupingPolicy } from '@logiclab/contracts/formula-policy-values';
import { ProblemType } from '@logiclab/contracts/problem-type';
import type { FitchDerivationContent } from '@logiclab/contracts/derivation';
import {
  fitchDerivationAnswerSchema,
  derivationEvaluationEvidenceSchema,
  type FitchDerivationAnswer,
  type DerivationEvaluationEvidence,
} from '@logiclab/contracts/derivation-work';
import { checkFitchProof } from '@logiclab/logic-engine/proof';
import { validateFitchContent } from '../problem/derivation/fitch/authoring';
import { StudentWorkError } from './errors';

/** Match the pinned catalog without checking correctness; unfinished/incorrect work stays saveable. */
export function validateFitchAnswer(
  value: unknown,
  ruleCatalogVersion: 1 | 2,
): FitchDerivationAnswer {
  const parsed = fitchDerivationAnswerSchema.safeParse(value);

  if (!parsed.success || parsed.data.proof.proofVersion !== ruleCatalogVersion)
    throw new StudentWorkError('invalid_answer');

  return parsed.data;
}

/**
 * Caller must authorize enrollment/workspace/check disclosure and load the pinned server content.
 * No student-supplied replacement statement, private reference or acceptance flag is consumed.
 * This pure helper writes nothing and assigns no grade, including for unassessable outcomes.
 */
export function evaluateFitchAnswer(
  authoritative: { itemId: string; problemVersionId: string; content: FitchDerivationContent },
  value: unknown,
): DerivationEvaluationEvidence {
  const content = validateFitchContent(authoritative.content);
  const answer = validateFitchAnswer(value, content.ruleCatalogVersion);

  return derivationEvaluationEvidenceSchema.parse({
    evaluationVersion: 'derivation_v1',
    type: ProblemType.Derivation,
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    report: checkFitchProof({
      problem: {
        ruleCatalogVersion: content.ruleCatalogVersion,
        ...formulaGroupingPolicy(content),
        premises: content.premises,
        conclusion: content.conclusion,
        permittedRuleIds: content.rules.map((rule) => rule.id),
      },
      proof: answer.proof,
    }),
  });
}
