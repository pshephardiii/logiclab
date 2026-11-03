import { submissionReviewSchema } from '@logiclab/contracts';
import { assignment as assignmentFixtureData } from '../../../test/assignment-fixture';
import { derivationContent } from '../../application/problem/derivation-authoring';
import { effectiveAssignmentScore } from '../../application/assignment/instructor-grading';
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

function reviewed(pending = true, earnedPoints: number | null = 8.5) {
  const f = fixture(pending);
  const itemId = f.score.items[0]!.itemId;
  const grading = {
    gradingVersion: 'instructor_grading_v1' as const,
    revision: 1,
    items: [
      {
        itemId,
        earnedPoints,
        comment: 'Review this justification.',
        reviewedBy: randomUUID(),
        reviewedAt: new Date().toISOString(),
      },
    ],
  };
  return { ...f, grading: { grading, score: effectiveAssignmentScore(f.score, grading) } };
}

test('manual points and comments remain withheld independently of revealed answers', () => {
  const f = reviewed();
  const value = attemptResponse(f.attempt, f.assignment, f.grading);
  expect(value).toMatchObject({ result: null, score: null, gradePending: true });
  expect(value).not.toHaveProperty('automaticScore');
  expect(value).not.toHaveProperty('instructorGrading');
  expect(JSON.stringify(value)).not.toContain('Review this justification.');
});

test.each([0, 8.5, null])(
  'released award %s retains automatic evidence and excludes private review metadata',
  (earnedPoints) => {
    const f = reviewed(true, earnedPoints);
    f.assignment.gradesReleasedAt = new Date();
    f.assignment.answersRevealedAt = undefined;
    const before = JSON.stringify(f.attempt);
    const value = attemptResponse(f.attempt, f.assignment, f.grading);
    expect(value.score).toEqual(f.grading.score);
    expect(value.automaticScore).toEqual(f.score);
    expect(value.result).toEqual(f.result);
    expect(value.instructorGrading?.items).toEqual([
      { itemId: f.score.items[0]!.itemId, earnedPoints, comment: 'Review this justification.' },
    ]);
    expect(value.score!.summary.status).toBe(earnedPoints === null ? 'needs_review' : 'graded');
    expect(JSON.stringify(value)).not.toMatch(/reviewedBy|reviewedAt|referenceProof|revisions/);
    expect(JSON.stringify(f.attempt)).toBe(before);
  },
);

test.each(['withheld', 'orphan', 'wrong-award', 'foreign', 'metadata', 'wrong-automatic'] as const)(
  'released grading contracts reject %s mismatches',
  (kind) => {
    const f = reviewed();
    f.assignment.gradesReleasedAt = new Date();
    const value = structuredClone(attemptResponse(f.attempt, f.assignment, f.grading));
    if (kind === 'withheld') value.gradePending = true;
    if (kind === 'orphan') delete value.automaticScore;
    if (kind === 'wrong-award') value.instructorGrading!.items[0]!.earnedPoints = 9;
    if (kind === 'foreign') value.instructorGrading!.items[0]!.itemId = randomUUID();
    if (kind === 'metadata')
      Object.assign(value.instructorGrading!.items[0]!, { reviewedBy: randomUUID() });
    if (kind === 'wrong-automatic')
      value.automaticScore = {
        ...f.score,
        items: f.score.items.map((item) => ({ ...item, itemId: randomUUID() })),
      };
    expect(savedStudentAttemptSchema.safeParse(value).success).toBe(false);
  },
);

function ownerReview() {
  const f = reviewed();
  f.assignment.gradesReleasedAt = new Date();
  const attempt = attemptResponse(f.attempt, f.assignment, f.grading);
  return {
    submission: {
      id: attempt.id,
      submittedAt: attempt.submittedAt,
      student: { id: randomUUID(), email: null },
      summary: f.result.summary,
      score: attempt.score,
    },
    assignment: {
      ...assignmentFixtureData,
      items: [
        {
          id: f.score.items[0]!.itemId,
          position: 1,
          title: 'Proof',
          instructions: null,
          maxPoints: 20,
          content: derivationContent(derivationDefinitionFixture()),
        },
      ],
    },
    attempt,
  };
}

test('owner graded proof contract preserves the original report and independent instructor award', () => {
  const review = ownerReview();
  expect(submissionReviewSchema.parse(review)).toEqual(review);
  expect(review.attempt.result).toMatchObject({ summary: { proofs: { needsReview: 1 } } });
  expect(review.attempt.score?.summary.earnedPoints).toBe(8.5);
  expect(review.attempt.automaticScore?.summary.earnedPoints).toBeNull();
});

test.each([
  'private-reference',
  'wrong-summary',
  'wrong-attempt',
  'wrong-score',
  'missing-score',
  'wrong-mode',
  'premature',
  'held',
])('owner graded proof contract rejects %s', (kind) => {
  const review = ownerReview();
  if (kind === 'private-reference')
    Object.assign(review.assignment.items[0]!.content, {
      referenceProof: derivationDefinitionFixture().referenceProof,
    });
  if (kind === 'wrong-summary') review.submission.summary.proofs.needsReview = 9;
  if (kind === 'wrong-attempt') review.submission.id = randomUUID();
  if (kind === 'wrong-score') review.submission.score = review.attempt.automaticScore;
  if (kind === 'missing-score') delete review.submission.score;
  if (kind === 'wrong-mode') review.assignment.assessmentMode = 'completion_only';
  if (kind === 'premature') review.attempt.submittedAt = null;
  if (kind === 'held') review.attempt.gradePending = true;
  expect(submissionReviewSchema.safeParse(review).success).toBe(false);
});
