import { formulaGroupingPolicy } from '@logiclab/contracts/formula-policy-values';
import { ProblemType } from '@logiclab/contracts/problem-type';
import type { TruthTreeContent } from '@logiclab/contracts/truth-tree-authoring';
import {
  truthTreeAnswerSchema,
  truthTreeEvaluationEvidenceV2Schema,
  truthTreeCompletionEvidenceV2Schema,
  assessTruthTreeVerdict,
  type TruthTreeAnswer,
  type TruthTreeEvaluationEvidenceV2,
  type TruthTreeCompletionEvidenceV2,
} from '@logiclab/contracts/truth-tree-work';
import { checkTruthTree, isFinishedTruthTreeAttempt } from '@logiclab/logic-engine/truth-tree';
import { validateTruthTreeContent } from '../problem/truth-tree/authoring';
import { StudentWorkError } from './errors';

type AssignedTruthTree = { itemId: string; problemVersionId: string; content: TruthTreeContent };

/** Match the pinned catalog without checking correctness: unfinished drafts remain saveable. */
export function validateTruthTreeAnswer(
  value: unknown,
  ruleCatalogVersion: TruthTreeContent['ruleCatalogVersion'],
): TruthTreeAnswer {
  const parsed = truthTreeAnswerSchema.safeParse(value);

  if (!parsed.success || parsed.data.tree.treeVersion !== ruleCatalogVersion)
    throw new StudentWorkError('invalid_answer');

  return parsed.data;
}

function prepared(authoritative: AssignedTruthTree, value: unknown) {
  const content = validateTruthTreeContent(authoritative.content);
  const answer = validateTruthTreeAnswer(value, content.ruleCatalogVersion);
  return {
    answer,
    input: {
      problem: {
        ruleCatalogVersion: content.ruleCatalogVersion,
        ...formulaGroupingPolicy(content),
        premises: content.premises,
        conclusion: content.conclusion,
      },
      tree: answer.tree,
    },
  };
}

/** Caller loads pinned content and enforces enrollment/disclosure; no references, writes or points. */
export function evaluateTruthTreeAnswer(
  authoritative: AssignedTruthTree,
  value: unknown,
): TruthTreeEvaluationEvidenceV2 {
  const { answer, input } = prepared(authoritative, value);
  const report = checkTruthTree(input);
  return truthTreeEvaluationEvidenceV2Schema.parse({
    evaluationVersion: 'truth_tree_v2',
    type: ProblemType.TruthTree,
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    report,
    verdict: assessTruthTreeVerdict(report, answer.verdict),
  });
}

/** Completion stays score-free while incorrect finished work retains its verification diagnostics. */
export function evaluateTruthTreeCompletion(
  authoritative: AssignedTruthTree,
  value: unknown,
): TruthTreeCompletionEvidenceV2 {
  const { answer, input } = prepared(authoritative, value);
  if (!answer.verdict || !isFinishedTruthTreeAttempt(input))
    throw new StudentWorkError('incomplete_work');

  const report = checkTruthTree(input);
  return truthTreeCompletionEvidenceV2Schema.parse({
    evaluationVersion: 'truth_tree_v2',
    type: ProblemType.TruthTree,
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    completedResponses: 1,
    totalResponses: 1,
    report,
    verdict: assessTruthTreeVerdict(report, answer.verdict),
  });
}
