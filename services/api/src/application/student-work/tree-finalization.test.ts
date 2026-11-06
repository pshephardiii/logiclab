import { randomUUID } from 'node:crypto';
import {
  treeDefinitionFixture,
  dependencyDefinitionFixture,
  derivationDefinitionFixture,
} from '../../../test/derivation-fixture';
import { evaluateProofSubmission } from './proof-submission';
import { evaluateProofCompletion } from './proof-completion';
import { scoreProofSubmission } from '../assignment/proof-scoring';
import { StudentWorkError } from './errors';

function fixture() {
  const definitions = [
    treeDefinitionFixture(),
    treeDefinitionFixture(),
    dependencyDefinitionFixture(),
    derivationDefinitionFixture(),
  ];
  const items = definitions.map((definition) => ({
    id: randomUUID(),
    problemVersionId: randomUUID(),
    definition,
  }));
  const answers = Object.fromEntries(
    items.map((item) => [
      item.id,
      { type: 'derivation', proof: structuredClone(item.definition.referenceProof!) },
    ]),
  );
  const wrong = answers[items[1]!.id]!.proof;
  if (wrong.format !== 'tree') throw Error('Expected tree');
  wrong.nodes[0]!.formula = 'Q';
  return { items, answers };
}

test('all three formats retain independent occurrence evidence and unresolved rather than zero points', () => {
  const f = fixture(),
    before = structuredClone(f);
  const result = evaluateProofSubmission(f.items, f.answers);
  expect(result.summary.proofs).toEqual({ total: 4, accepted: 3, needsReview: 1, unassessable: 0 });
  const score = scoreProofSubmission(
    f.items.map((item) => ({ itemId: item.id, maxPoints: 10 })),
    result,
  );
  expect(score.items[0]).toMatchObject({ status: 'graded', earnedPoints: 10 });
  expect(score.items[1]).toMatchObject({ status: 'needs_review', earnedPoints: null });
  expect(score.summary.earnedPoints).toBeNull();
  expect(f).toEqual(before);
});

test('missing graded tree work creates review-needed evidence instead of a wrong-format fallback', () => {
  const { items } = fixture();
  expect(evaluateProofSubmission([items[0]!], {})).toMatchObject({
    summary: { proofs: { needsReview: 1 } },
    items: [{ report: { status: 'needs_review' } }],
  });
});

test('score-free completion retains verification flags even when a filled tree is wrong', () => {
  const { items, answers } = fixture();
  const result = evaluateProofCompletion(items, answers);
  expect(result.summary.proofVerification).toEqual({
    verified: 3,
    errorsFound: 1,
    unavailable: 0,
    total: 4,
  });
  expect(result.summary.completedResponses).toBe(4);
  expect(JSON.stringify(result)).not.toMatch(/earnedPoints|referenceProof|explanation/);
});

test('completion rejects an unfinished tree and preserves caller-owned draft data', () => {
  const f = fixture();
  const answer = f.answers[f.items[0]!.id]!.proof;
  if (answer.format !== 'tree') throw Error();
  const root = answer.nodes[1]!;
  if (root.kind !== 'inference') throw Error();
  root.branches[0]!.rootId = null;
  const before = structuredClone(f);
  expect(() => evaluateProofCompletion(f.items, f.answers)).toThrow(StudentWorkError);
  expect(f).toEqual(before);
});

test.each(['graded', 'completion'] as const)(
  'wrong-format work is rejected during %s finalization',
  (mode) => {
    const f = fixture();
    f.answers[f.items[0]!.id] = f.answers[f.items[2]!.id]!;
    expect(() =>
      (mode === 'graded' ? evaluateProofSubmission : evaluateProofCompletion)(f.items, f.answers),
    ).toThrow(StudentWorkError);
  },
);

test('unassessable tree verification remains distinct from incorrect work and numerical grades', () => {
  const f = fixture();
  const answer = f.answers[f.items[0]!.id]!.proof;
  if (answer.format !== 'tree') throw Error();
  answer.nodes[0]!.formula = '!'.repeat(33) + 'P';
  const result = evaluateProofSubmission(f.items, f.answers);
  expect(result.summary.proofs.unassessable).toBe(1);
  expect(
    scoreProofSubmission(
      f.items.map((item) => ({ itemId: item.id, maxPoints: 10 })),
      result,
    ).items[0],
  ).toMatchObject({ status: 'needs_review', earnedPoints: null });
  expect(evaluateProofCompletion(f.items, f.answers).summary.proofVerification.unavailable).toBe(1);
});
