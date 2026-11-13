import type { NaturalDeductionTreeDerivationContent } from '@logiclab/contracts/natural-deduction-tree-derivation';
import {
  naturalDeductionTreeDerivationAnswerSchema,
  type NaturalDeductionTreeDerivationAnswer,
} from '@logiclab/contracts/natural-deduction-tree-derivation-work';
import {
  derivationEvaluationEvidenceSchema,
  type DerivationEvaluationEvidence,
} from '@logiclab/contracts/derivation-work';
import { checkNaturalDeductionTreeProof } from '@logiclab/logic-engine/proof';
import { validateNaturalDeductionTreeContent } from '../problem/derivation/natural-deduction-tree/authoring';
import { StudentWorkError } from './errors';

/** Save-shape validation only; incomplete and incorrect work remains unchanged draft data. */
export function validateNaturalDeductionTreeAnswer(
  value: unknown,
): NaturalDeductionTreeDerivationAnswer {
  const parsed = naturalDeductionTreeDerivationAnswerSchema.safeParse(value);

  if (!parsed.success) throw new StudentWorkError('invalid_answer');

  return parsed.data;
}

/** Caller loads pinned content and authorizes enrollment/disclosure. No reference, writes or points. */
export function evaluateNaturalDeductionTreeAnswer(
  authoritative: {
    itemId: string;
    problemVersionId: string;
    content: NaturalDeductionTreeDerivationContent;
  },
  value: unknown,
): DerivationEvaluationEvidence {
  const content = validateNaturalDeductionTreeContent(authoritative.content);
  const answer = validateNaturalDeductionTreeAnswer(value);

  return derivationEvaluationEvidenceSchema.parse({
    evaluationVersion: 'derivation_v1',
    type: 'derivation',
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    report: checkNaturalDeductionTreeProof({
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
