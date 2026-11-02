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
