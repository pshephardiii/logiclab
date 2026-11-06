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

/** Validate only bounded transport. Incorrect, unfinished and structurally invalid proofs can save. */
export function validateFitchAnswer(value: unknown): FitchDerivationAnswer {
  const parsed = fitchDerivationAnswerSchema.safeParse(value);

  if (!parsed.success) throw new StudentWorkError('invalid_answer');

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
  const answer = validateFitchAnswer(value);

  return derivationEvaluationEvidenceSchema.parse({
    evaluationVersion: 'derivation_v1',
    type: 'derivation',
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    report: checkFitchProof({
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
