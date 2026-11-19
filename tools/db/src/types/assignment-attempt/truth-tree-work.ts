import type { TruthTree } from '../truth-tree/work.ts';
import type { TruthTreeCheckReport } from '../truth-tree/report.ts';

export type TruthTreeAnswer = { type: 'truth_tree'; tree: TruthTree };

export interface TruthTreeEvaluationEvidence {
  evaluationVersion: 'truth_tree_v1';
  type: 'truth_tree';
  itemId: string;
  problemVersionId: string;
  report: TruthTreeCheckReport;
}
