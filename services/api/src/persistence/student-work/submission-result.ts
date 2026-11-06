import type { Assignment, AssignmentItem, AssignmentAttempt } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import { assignmentResponsesSchema } from '@logiclab/contracts';
import { scoreObjectiveSubmission } from '../../application/assignment/scoring';
import { scoreProofSubmission } from '../../application/assignment/proof-scoring';
import { validAssignmentScoring } from '../../application/assignment/scoring-policy';
import { libraryProblemDefinition } from '../../application/problem/library-definition';
import { supportedProblemDefinition } from '../../application/problem/definition-support';
import { assertProofWorkPolicy } from '../../application/student-work/proof-policy';
import { evaluateProofCompletion } from '../../application/student-work/proof-completion';
import { evaluateProofSubmission } from '../../application/student-work/proof-submission';
import {
  evaluateAssignmentSubmission,
  evaluateAssignmentCompletion,
} from '../../application/student-work/mixed-evaluation';
import { StudentWorkError } from '../../application/student-work/errors';

type CalculatedSubmission = {
  result: NonNullable<AssignmentAttempt['result']>;
  score?: AssignmentAttempt['score'];
};

/** Calculate from loaded pinned work; caller authorizes, locks and persists the final snapshot. */
export function calculateSubmissionResult(
  assignment: Assignment,
  assigned: AssignmentItem[],
  answers: AssignmentAttempt['answers'],
): CalculatedSubmission {
  if (!validAssignmentScoring(assignment, assigned))
    throw new StudentWorkError('unsupported_policy');

  const containsProof = assigned.some(
    (item) => item.problemVersion.definition.type === 'derivation',
  );

  if (containsProof) assertProofWorkPolicy(assignment);

  const allocations = assigned.map((item) => ({
    itemId: item.id,
    maxPoints: item.maxPoints!,
  }));

  if (containsProof) {
    // Proof evidence and automatic points are frozen separately from later instructor awards.
    const occurrences = assigned.map((item) => ({
      id: item.id,
      problemVersionId: item.problemVersion.id,
      definition: libraryProblemDefinition(item.problemVersion.definition),
    }));

    if (assignment.assessmentMode === 'completion_only')
      return { result: evaluateProofCompletion(occurrences, answers) };

    const result = evaluateProofSubmission(occurrences, answers);

    return { result, score: scoreProofSubmission(allocations, result) };
  }

  const evaluate =
    assignment.assessmentMode === 'completion_only'
      ? evaluateAssignmentCompletion
      : evaluateAssignmentSubmission;

  const result = evaluate(
    assigned.map((item) => ({
      id: item.id,
      definition: supportedProblemDefinition(item.problemVersion.definition),
    })),
    assignmentResponsesSchema.parse(answers),
  );

  return {
    result,
    ...(assignment.assessmentMode === 'graded'
      ? { score: scoreObjectiveSubmission(allocations, result) }
      : {}),
  };
}
