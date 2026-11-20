import { truthTreeEvaluationEvidenceSchema } from '@logiclab/contracts/truth-tree-work';
import { AssignmentScoringError, type AssignmentScoringOutcome } from './scoring';
import { proofResponseVerification } from '@logiclab/contracts/proof-submission';

/** Fresh server evidence only. A verified invalid argument is a successful refutation, not zero. */
export function truthTreeScoringOutcome(input: unknown): AssignmentScoringOutcome {
  const parsed = truthTreeEvaluationEvidenceSchema.safeParse(input);

  if (!parsed.success) throw new AssignmentScoringError();

  return {
    itemId: parsed.data.itemId,
    outcome: {
      type: proofResponseVerification(parsed.data) === 'verified' ? 'full_credit' : 'needs_review',
    },
  };
}
