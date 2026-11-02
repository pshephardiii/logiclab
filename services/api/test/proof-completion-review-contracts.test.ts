import { randomUUID } from 'node:crypto';
import {
  assignmentScoreSchema,
  submissionReviewSchema,
  submissionSummarySchema,
} from '@logiclab/contracts';
import { derivationDefinitionFixture } from './derivation-fixture';
import { derivationContent } from '../src/application/problem/derivation-authoring';
import { evaluateProofCompletion } from '../src/application/student-work/proof-completion';
import { assignment } from './assignment-fixture';

function fixture() {
  const itemId = randomUUID();
  const definition = derivationDefinitionFixture();
  const answers = { [itemId]: { type: 'derivation' as const, proof: definition.referenceProof! } };
  const result = evaluateProofCompletion(
    [{ id: itemId, problemVersionId: randomUUID(), definition }],
    answers,
  );
  const attempt = {
    id: randomUUID(),
    revision: 1,
    answers,
    submittedAt: '2026-11-02T12:00:00.000Z',
    result,
    gradePending: false,
  };
  return {
    submission: {
      id: attempt.id,
      submittedAt: attempt.submittedAt,
      student: { id: randomUUID(), email: null },
      summary: result.summary,
    },
    assignment: {
      ...assignment,
      assessmentMode: 'completion_only',
      feedbackTiming: 'on_submission',
      items: [
        {
          id: itemId,
          position: 1,
          title: 'Proof',
          instructions: null,
          content: derivationContent(definition),
        },
      ],
    },
    attempt,
  };
}
test('completion owner contracts retain frozen reports without keys or points', () => {
  const review = fixture();
  expect(submissionReviewSchema.parse(review)).toEqual(review);
  const score = {
    scoringVersion: 'points_v1',
    items: [
      { itemId: review.assignment.items[0]!.id, maxPoints: 10, earnedPoints: 10, status: 'graded' },
    ],
    summary: { maxPoints: 10, earnedPoints: 10, percentage: 100, status: 'graded' },
  };
  expect(assignmentScoreSchema.safeParse(score).success).toBe(true);
  expect(submissionSummarySchema.safeParse({ ...review.submission, score }).success).toBe(false);
});
test.each([
  'graded',
  'premature',
  'points',
  'wrong-summary',
  'wrong-attempt',
  'private-reference',
  'legacy-feedback',
])('completion owner contracts reject %s projections', (kind) => {
  const review = fixture();
  if (kind === 'graded') review.assignment.assessmentMode = 'graded';
  if (kind === 'premature') Object.assign(review.attempt, { submittedAt: null });
  if (kind === 'points') Object.assign(review.attempt, { score: {} });
  if (kind === 'wrong-summary')
    review.submission.summary = { ...review.submission.summary, completedResponses: 9 };
  if (kind === 'wrong-attempt') review.submission.id = randomUUID();
  if (kind === 'private-reference')
    Object.assign(review.assignment.items[0]!.content, {
      referenceProof: derivationDefinitionFixture().referenceProof,
    });
  if (kind === 'legacy-feedback') review.assignment.feedbackTiming = 'on_check';
  expect(submissionReviewSchema.safeParse(review).success).toBe(false);
});
