import type { ProofCheckReport } from '../proof/report.ts';
import type { MixedGradedItem } from './mixed-work.ts';
import type { SubmissionCounts } from './work.ts';

export interface DerivationEvaluationEvidence {
  evaluationVersion: 'derivation_v1';
  type: 'derivation';
  itemId: string;
  problemVersionId: string;
  report: ProofCheckReport;
}
export interface ProofSubmissionResult {
  gradingVersion: 'proof_mixed_v1';
  items: (MixedGradedItem | DerivationEvaluationEvidence)[];
  summary: {
    objective: SubmissionCounts;
    proofs: { accepted: number; needsReview: number; unassessable: number; total: number };
  };
}

/** Finished work is acknowledged independently from the retained verification report. */
export interface ProofCompletionSubmissionResult {
  gradingVersion: 'proof_completion_v1';
  items: (
    | {
        itemId: string;
        type: 'truth_table' | 'true_false' | 'multiple_choice';
        completedResponses: number;
        totalResponses: number;
      }
    | (DerivationEvaluationEvidence & { completedResponses: 1; totalResponses: 1 })
  )[];
  summary: {
    completedResponses: number;
    totalResponses: number;
    proofVerification: {
      verified: number;
      errorsFound: number;
      unavailable: number;
      total: number;
    };
  };
}
