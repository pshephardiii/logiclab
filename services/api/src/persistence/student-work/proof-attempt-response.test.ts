import { randomUUID } from 'node:crypto';
import type {
  Assignment,
  AssignmentAttempt,
  ProofSubmissionResult as StoredResult,
  ProofCheckReport as StoredReport,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { ProofSubmissionResult } from '@logiclab/contracts/proof-submission';
import { studentAttemptSchema, type ProofCheckReport } from '@logiclab/contracts';
import { savedStudentAttemptSchema } from '@logiclab/contracts/saved-student-work';
import { derivationDefinitionFixture } from '../../../test/derivation-fixture';
import { evaluateProofSubmission } from '../../application/student-work/proof-submission';
import { scoreProofSubmission } from '../../application/assignment/proof-scoring';
import { attemptResponse } from './attempt-response';

type Assert<T extends true> = T;
type ResultTypesMatch = Assert<
  StoredResult extends ProofSubmissionResult
    ? ProofSubmissionResult extends StoredResult
      ? true
      : false
    : false
>;
type ReportTypesMatch = Assert<
  StoredReport extends ProofCheckReport
    ? ProofCheckReport extends StoredReport
      ? true
      : false
    : false
>;

function fixture(pending = false) {
  const definition = derivationDefinitionFixture();
  const itemId = randomUUID();
  const answers = {
    [itemId]: { type: 'derivation' as const, proof: structuredClone(definition.referenceProof!) },
  };
  if (pending) answers[itemId]!.proof.steps[1]!.formula = 'Q';
  const result = evaluateProofSubmission(
    [{ id: itemId, problemVersionId: randomUUID(), definition }],
    answers,
  );
  const score = scoreProofSubmission([{ itemId, maxPoints: 20 }], result);
  const attempt = {
    id: randomUUID(),
    revision: 2,
    answers,
    submittedAt: new Date(),
    result,
    score,
  } as unknown as AssignmentAttempt;
  const assignment = {
    assessmentMode: 'graded',
    gradeReleaseTiming: 'instructor_release',
    gradesReleasedAt: undefined,
    answersRevealedAt: new Date(),
  } as unknown as Assignment;
  return { attempt, assignment, result, score };
}

test('unreleased proof reports/points stay hidden even when the answer key was revealed', () => {
  const f = fixture();
  const value = attemptResponse(f.attempt, f.assignment);
  expect(value.result).toBeNull();
  expect(value.score).toBeNull();
  expect(value.gradePending).toBe(true);
  expect(value.answers).toEqual(f.attempt.answers);
  expect(f.attempt.result).toEqual(f.result);
  expect(f.attempt.score).toEqual(f.score);
});

test.each([false, true])(
  'released proof evidence preserves the frozen %s review state independently of answer access',
  (pending) => {
    const f = fixture(pending);
    f.assignment.gradesReleasedAt = new Date();
    f.assignment.answersRevealedAt = undefined;
    const before = JSON.stringify(f.attempt);
    const value = attemptResponse(f.attempt, f.assignment);
    expect(value.result).toEqual(f.result);
    expect(value.score).toEqual(f.score);
    expect(value.gradePending).toBe(false);
    expect(value.score!.summary.status).toBe(pending ? 'needs_review' : 'graded');
    expect(value.score!.summary.earnedPoints).toBe(pending ? null : 20);
    expect(JSON.stringify(value)).not.toContain('referenceProof');
    expect(JSON.stringify(value)).not.toContain('explanation');
    expect(JSON.stringify(f.attempt)).toBe(before);
    expect(savedStudentAttemptSchema.safeParse(value).success).toBe(true);
    expect(studentAttemptSchema.safeParse(value).success).toBe(false);
  },
);

test('on-submission release exposes reports but never turns a review-needed proof into a final numeric grade', () => {
  const f = fixture(true);
  f.assignment.gradeReleaseTiming = 'on_submission' as Assignment['gradeReleaseTiming'];
  const value = attemptResponse(f.attempt, f.assignment);
  expect(value.result).toEqual(f.result);
  expect(value.score!.summary).toMatchObject({
    status: 'needs_review',
    earnedPoints: null,
    percentage: null,
  });
});

test.each(['missing', 'mismatched', 'premature', 'wrong_mode'] as const)(
  'rejects %s retained proof/score combinations without rewriting evidence',
  (kind) => {
    const f = fixture(kind === 'mismatched');
    if (kind === 'missing') f.attempt.score = undefined;
    if (kind === 'mismatched') {
      f.attempt.score = {
        scoringVersion: 'points_v1',
        items: f.score.items.map((item) => ({
          itemId: item.itemId,
          maxPoints: 20,
          status: 'graded',
          earnedPoints: 20,
        })),
        summary: { status: 'graded', maxPoints: 20, earnedPoints: 20, percentage: 100 },
      };
    }
    if (kind === 'premature') f.attempt.submittedAt = undefined;
    if (kind === 'wrong_mode')
      f.assignment.assessmentMode = 'completion_only' as Assignment['assessmentMode'];
    const source = JSON.stringify(f.attempt);
    expect(() => attemptResponse(f.attempt, f.assignment)).toThrow();
    expect(JSON.stringify(f.attempt)).toBe(source);
  },
);
