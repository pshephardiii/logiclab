import { randomUUID } from 'node:crypto';
import type {
  Assignment,
  AssignmentAttempt,
  ProofCompletionSubmissionResult as StoredResult,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import { savedStudentAttemptSchema } from '@logiclab/contracts/saved-student-work';
import {
  studentAttemptSchema,
  submissionSummarySchema,
  assignmentScoreSchema,
} from '@logiclab/contracts';
import {
  summarizeProofCompletionVerification,
  type ProofCompletionSubmissionResult,
} from '@logiclab/contracts/proof-submission';
import { evaluateProofCompletion } from '../../application/student-work/proof-completion';
import { derivationDefinitionFixture } from '../../../test/derivation-fixture';
import { attemptResponse } from './attempt-response';
import { proofCompletionReviewResponse } from '../submission-review/proof-completion-response';

type Assert<T extends true> = T;
type ResultTypesMatch = Assert<
  StoredResult extends ProofCompletionSubmissionResult
    ? ProofCompletionSubmissionResult extends StoredResult
      ? true
      : false
    : false
>;
function fixture(status: 'accepted' | 'needs_review' | 'unassessable' = 'accepted') {
  const itemId = randomUUID();
  const definition = derivationDefinitionFixture();
  const answer = {
    type: 'derivation' as const,
    proof: structuredClone(definition.referenceProof!),
  };
  if (status === 'needs_review') answer.proof.steps[0]!.formula = 'Q';
  const result = evaluateProofCompletion(
    [{ id: itemId, problemVersionId: randomUUID(), definition }],
    { [itemId]: answer },
  );
  if (status === 'unassessable') {
    const item = result.items[0]!;
    if (item.type !== 'derivation') throw new Error('Expected proof');
    item.report = {
      checkerVersion: 1,
      ruleCatalogVersion: 1,
      status: 'unassessable',
      target: 'unknown',
      steps: [],
      diagnostics: [{ code: 'RESOURCE_LIMIT', message: 'Frozen unavailable verification.' }],
    };
    result.summary.proofVerification = summarizeProofCompletionVerification(result.items);
  }
  const attempt = {
    id: randomUUID(),
    revision: 2,
    student: { id: randomUUID(), email: null },
    submittedAt: new Date(),
    answers: { [itemId]: answer },
    result,
  } as unknown as AssignmentAttempt;
  const assignment = {
    assessmentMode: 'completion_only',
    gradeReleaseTiming: 'on_submission',
    gradesReleasedAt: undefined,
    answersRevealedAt: undefined,
    solutionAccess: 'instructor_release',
  } as unknown as Assignment;
  const score = {
    scoringVersion: 'points_v1' as const,
    items: [{ itemId, maxPoints: 1, earnedPoints: 1, status: 'graded' as const }],
    summary: { status: 'graded' as const, maxPoints: 1, earnedPoints: 1, percentage: 100 },
  };
  return { attempt, assignment, result, itemId, score };
}
test.each(['accepted', 'needs_review', 'unassessable'] as const)(
  '%s completion projects frozen diagnostics and verification flags without points or answer reveal',
  (status) => {
    const f = fixture(status);
    const snapshot = JSON.stringify(f.attempt);
    const student = attemptResponse(f.attempt, f.assignment);
    const instructor = proofCompletionReviewResponse(f.attempt, f.assignment);
    expect(student.result).toEqual(f.result);
    expect(student.score).toBeUndefined();
    expect(student.gradePending).toBe(false);
    expect(instructor.submission.summary).toEqual(f.result.summary);
    expect(instructor.attempt.result).toEqual(f.result);
    expect(instructor.attempt.answers).toEqual(student.answers);
    expect(instructor.submission).not.toHaveProperty('score');
    expect(instructor.attempt).not.toHaveProperty('score');
    expect(JSON.stringify(instructor)).not.toContain('referenceProof');
    expect(JSON.stringify(student)).not.toContain('explanation');
    expect(JSON.stringify(f.attempt)).toBe(snapshot);
    expect(savedStudentAttemptSchema.safeParse(student).success).toBe(true);
    expect(studentAttemptSchema.safeParse(student).success).toBe(false);
    // Owner list summaries expose completion verification without a point score.
    expect(submissionSummarySchema.safeParse(instructor.submission).success).toBe(true);
  },
);
test.each(['premature', 'graded', 'practice', 'score'] as const)(
  'rejects %s completion snapshots without changing retained work',
  (kind) => {
    const f = fixture();
    if (kind === 'premature') f.attempt.submittedAt = undefined;
    if (kind === 'graded') f.assignment.assessmentMode = 'graded' as Assignment['assessmentMode'];
    if (kind === 'practice')
      f.assignment.assessmentMode = 'ungraded_practice' as Assignment['assessmentMode'];
    if (kind === 'score') f.attempt.score = f.score;
    const source = JSON.stringify(f.attempt);
    expect(() => attemptResponse(f.attempt, f.assignment)).toThrow();
    expect(() => proofCompletionReviewResponse(f.attempt, f.assignment)).toThrow();
    expect(JSON.stringify(f.attempt)).toBe(source);
  },
);
test('rejects inconsistent verification flags and produces detached projection data', () => {
  const f = fixture('needs_review');
  const student = attemptResponse(f.attempt, f.assignment);
  const result = student.result;
  if (result?.gradingVersion !== 'proof_completion_v1' || result.items[0]!.type !== 'derivation')
    throw new Error('Expected proof');
  result.items[0]!.report.diagnostics[0]!.message = 'Changed local projection';
  expect(JSON.stringify(f.attempt)).not.toContain('Changed local projection');
  f.result.summary.proofVerification = { verified: 1, errorsFound: 0, unavailable: 0, total: 1 };
  expect(() => attemptResponse(f.attempt, f.assignment)).toThrow();
  expect(() => proofCompletionReviewResponse(f.attempt, f.assignment)).toThrow();
});
test('completion attempt contracts reject premature results and any awarded score', () => {
  const f = fixture();
  const response = attemptResponse(f.attempt, f.assignment);
  expect(savedStudentAttemptSchema.safeParse({ ...response, submittedAt: null }).success).toBe(
    false,
  );
  expect(assignmentScoreSchema.safeParse(f.score).success).toBe(true);
  expect(savedStudentAttemptSchema.safeParse({ ...response, score: f.score }).success).toBe(false);
});
