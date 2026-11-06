import type { TreeDerivationContent } from '@logiclab/contracts/tree-derivation';
import {
  treeDerivationAnswerSchema,
  type TreeDerivationAnswer,
} from '@logiclab/contracts/tree-derivation-work';
import {
  derivationEvaluationEvidenceSchema,
  type DerivationEvaluationEvidence,
} from '@logiclab/contracts/derivation-work';
import { checkTreeProof } from '@logiclab/logic-engine/proof';
import { validateTreeContent } from '../problem/derivation/tree/authoring';
import { StudentWorkError } from './errors';

/** Save-shape validation only; incomplete and incorrect work remains unchanged draft data. */
export function validateTreeAnswer(value: unknown): TreeDerivationAnswer {
  const parsed = treeDerivationAnswerSchema.safeParse(value);
  if (!parsed.success) throw new StudentWorkError('invalid_answer');
  return parsed.data;
}

/** Caller loads pinned content and authorizes enrollment/disclosure. No reference, writes or points. */
export function evaluateTreeAnswer(
  authoritative: { itemId: string; problemVersionId: string; content: TreeDerivationContent },
  value: unknown,
): DerivationEvaluationEvidence {
  const content = validateTreeContent(authoritative.content);
  const answer = validateTreeAnswer(value);
  return derivationEvaluationEvidenceSchema.parse({
    evaluationVersion: 'derivation_v1',
    type: 'derivation',
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    report: checkTreeProof({
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
