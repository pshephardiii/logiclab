import { ProblemType } from '@logiclab/contracts/problem-type';
import type { TruthTreeContent } from '@logiclab/contracts/truth-tree-authoring';
import {
  truthTreeAnswerSchema,
  truthTreeEvaluationEvidenceSchema,
  truthTreeCompletionEvidenceSchema,
  type TruthTreeAnswer,
  type TruthTreeEvaluationEvidence,
  type TruthTreeCompletionEvidence,
} from '@logiclab/contracts/truth-tree-work';
import { checkTruthTree, isFinishedTruthTreeAttempt } from '@logiclab/logic-engine/truth-tree';
import { validateTruthTreeContent } from '../problem/truth-tree/authoring';
import { StudentWorkError } from './errors';

type AssignedTruthTree = { itemId: string; problemVersionId: string; content: TruthTreeContent };

/** Save-shape validation only: blank/incorrect work must remain retainable as a draft. */
export function validateTruthTreeAnswer(value: unknown): TruthTreeAnswer {
  const parsed = truthTreeAnswerSchema.safeParse(value);

  if (!parsed.success) throw new StudentWorkError('invalid_answer');

  return parsed.data;
}

function prepared(authoritative: AssignedTruthTree, value: unknown) {
  const content = validateTruthTreeContent(authoritative.content);
  const answer = validateTruthTreeAnswer(value);
  return {
    problem: {
      ruleCatalogVersion: content.ruleCatalogVersion,
      premises: content.premises,
      conclusion: content.conclusion,
    },
    tree: answer.tree,
  };
}

/** Caller loads pinned content and enforces enrollment/disclosure; no references, writes or points. */
export function evaluateTruthTreeAnswer(
  authoritative: AssignedTruthTree,
  value: unknown,
): TruthTreeEvaluationEvidence {
  return truthTreeEvaluationEvidenceSchema.parse({
    evaluationVersion: 'truth_tree_v1',
    type: ProblemType.TruthTree,
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    report: checkTruthTree(prepared(authoritative, value)),
  });
}

/** Completion stays score-free while incorrect finished work retains its verification diagnostics. */
export function evaluateTruthTreeCompletion(
  authoritative: AssignedTruthTree,
  value: unknown,
): TruthTreeCompletionEvidence {
  const input = prepared(authoritative, value);
  if (!isFinishedTruthTreeAttempt(input)) throw new StudentWorkError('incomplete_work');

  return truthTreeCompletionEvidenceSchema.parse({
    evaluationVersion: 'truth_tree_v1',
    type: ProblemType.TruthTree,
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    completedResponses: 1,
    totalResponses: 1,
    report: checkTruthTree(input),
  });
}
