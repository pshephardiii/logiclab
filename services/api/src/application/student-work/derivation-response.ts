import type { DerivationContent } from '@logiclab/contracts/derivation';
import {
  derivationAnswerSchema,
  derivationEvaluationEvidenceSchema,
  type DerivationAnswer,
  type DerivationEvaluationEvidence,
} from '@logiclab/contracts/derivation-work';
import { checkProof } from '@logiclab/logic-engine/proof';
import { validateFitchContent } from '../problem/derivation/fitch/authoring';
import { StudentWorkError } from './errors';

/** Validate only bounded transport. Incorrect, unfinished and structurally invalid proofs can save. */
export function validateDerivationAnswer(value: unknown): DerivationAnswer {
  const parsed = derivationAnswerSchema.safeParse(value);
  if (!parsed.success) throw new StudentWorkError('invalid_answer');
  return parsed.data;
}

/**
 * Caller must authorize enrollment/workspace/check disclosure and load the pinned server content.
 * No student-supplied replacement statement, private reference or acceptance flag is consumed.
 * This pure helper writes nothing and assigns no grade, including for unassessable outcomes.
 */
export function evaluateDerivationAnswer(
  authoritative: { itemId: string; problemVersionId: string; content: DerivationContent },
  value: unknown,
): DerivationEvaluationEvidence {
  const content = validateFitchContent(authoritative.content);
  const answer = validateDerivationAnswer(value);
  return derivationEvaluationEvidenceSchema.parse({
    evaluationVersion: 'derivation_v1',
    type: 'derivation',
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    report: checkProof({
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
