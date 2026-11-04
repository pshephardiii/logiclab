import { randomUUID } from 'node:crypto';
import {
  dependencyDefinitionFixture,
  derivationDefinitionFixture,
} from '../../../test/derivation-fixture';
import { evaluateProofSubmission } from './proof-submission';
import { evaluateProofCompletion } from './proof-completion';
import { scoreProofSubmission } from '../assignment/proof-scoring';
import { StudentWorkError } from './errors';
function fixture() {
  const dependency = dependencyDefinitionFixture(),
    fitch = derivationDefinitionFixture();
  const first = { id: randomUUID(), problemVersionId: randomUUID(), definition: dependency };
  const second = { ...first, id: randomUUID() };
  const third = { id: randomUUID(), problemVersionId: randomUUID(), definition: fitch };
  const wrong = structuredClone(dependency.referenceProof!);
  wrong.steps[0]!.formula = 'Q';
  const answers = {
    [first.id]: { type: 'derivation', proof: dependency.referenceProof },
    [second.id]: { type: 'derivation', proof: wrong },
    [third.id]: { type: 'derivation', proof: fitch.referenceProof },
  };
  return { first, second, third, answers, items: [first, second, third] };
}
test('mixed formats use their own checkers, preserving per-occurrence evidence and pending rather than zero points', () => {
  const f = fixture(),
    before = structuredClone(f);
  const result = evaluateProofSubmission(f.items, f.answers);
  expect(result.summary.proofs).toEqual({ total: 3, accepted: 2, needsReview: 1, unassessable: 0 });
  const score = scoreProofSubmission(
    f.items.map((item) => ({ itemId: item.id, maxPoints: 10 })),
    result,
  );
  expect(score.items.find((item) => item.itemId === f.second.id)).toMatchObject({
    status: 'needs_review',
    earnedPoints: null,
  });
  expect(score.summary.earnedPoints).toBeNull();
  expect(f).toEqual(before);
});
test('missing graded dependency work produces review-needed evidence rather than a transport-format error', () => {
  const f = fixture();
  const result = evaluateProofSubmission([f.first], {});
  expect(result.summary.proofs.needsReview).toBe(1);
  expect(result.items[0]).toMatchObject({
    itemId: f.first.id,
    problemVersionId: f.first.problemVersionId,
    report: { status: 'needs_review' },
  });
});
test('completion retains dependency mistakes and mixed-format verification without any score', () => {
  const f = fixture();
  const result = evaluateProofCompletion(f.items, f.answers);
  expect(result.summary.proofVerification).toEqual({
    verified: 2,
    errorsFound: 1,
    unavailable: 0,
    total: 3,
  });
  expect(result.summary.completedResponses).toBe(3);
  expect(JSON.stringify(result)).not.toMatch(/earnedPoints|referenceProof|explanation/);
});
test('completion does not accept an unfilled dependency discharge', () => {
  const f = fixture();
  const answer = f.answers[f.first.id]!;
  if (!answer.proof || answer.proof.format !== 'dependency')
    throw new Error('Expected dependency proof');
  const last = answer.proof.steps[1]!;
  if (last.kind !== 'inference') throw new Error('Expected inference');
  last.discharges[0]!.conclusionId = null;
  expect(() => evaluateProofCompletion(f.items, f.answers)).toThrow(StudentWorkError);
});
test.each(['graded', 'completion'] as const)(
  'wrong-format saved work is rejected during %s finalization',
  (mode) => {
    const f = fixture();
    f.answers[f.first.id] = f.answers[f.third.id]!;
    expect(() =>
      (mode === 'graded' ? evaluateProofSubmission : evaluateProofCompletion)(f.items, f.answers),
    ).toThrow(StudentWorkError);
  },
);
