import { randomUUID } from 'node:crypto';
import { generateTruthTable } from '@logiclab/logic-engine';
import { proofSubmissionResultSchema } from '@logiclab/contracts/proof-submission';
import { submissionResultSchema } from '@logiclab/contracts';
import { savedStudentAttemptSchema } from '@logiclab/contracts/saved-student-work';
import { derivationDefinitionFixture } from '../../../test/derivation-fixture';
import { evaluateProofSubmission, type ProofSubmissionOccurrence } from './proof-submission';
import { scoreProofSubmission } from '../assignment/proof-scoring';
import { AssignmentScoringError } from '../assignment/scoring';
import { StudentWorkError } from './errors';

function fixture() {
  const definition = derivationDefinitionFixture();
  const proof = { id: randomUUID(), problemVersionId: randomUUID(), definition };
  const truth: ProofSubmissionOccurrence = {
    id: randomUUID(),
    problemVersionId: randomUUID(),
    definition: {
      type: 'true_false',
      definitionVersion: 1,
      question: 'Always?',
      correctAnswer: false,
      explanation: 'PRIVATE_ANSWER_EXPLANATION',
    },
  };
  const answers = {
    [proof.id]: { type: 'derivation' as const, proof: structuredClone(definition.referenceProof!) },
    [truth.id]: { type: 'true_false' as const, answer: true },
  };
  const allocations = [
    { itemId: proof.id, maxPoints: 20 },
    { itemId: truth.id, maxPoints: 10 },
  ];
  return { proof, truth, answers, allocations };
}

test('mixed evaluation retains order/provenance and scores objective work independently of full-credit proofs', () => {
  const f = fixture();
  const items = [f.truth, f.proof];
  const source = structuredClone({ items, answers: f.answers });
  const result = evaluateProofSubmission(items, f.answers);
  expect(result.items.map((item) => item.itemId)).toEqual([f.truth.id, f.proof.id]);
  expect(result.items[1]).toMatchObject({
    type: 'derivation',
    problemVersionId: f.proof.problemVersionId,
    report: { status: 'accepted' },
  });
  expect(result.summary).toEqual({
    objective: { correct: 0, incorrect: 1, unanswered: 0, total: 1 },
    proofs: { accepted: 1, needsReview: 0, unassessable: 0, total: 1 },
  });
  const score = scoreProofSubmission(f.allocations, result);
  expect(score.items).toEqual([
    { itemId: f.proof.id, maxPoints: 20, status: 'graded', earnedPoints: 20 },
    { itemId: f.truth.id, maxPoints: 10, status: 'graded', earnedPoints: 0 },
  ]);
  expect(score.summary).toEqual({
    status: 'graded',
    maxPoints: 30,
    earnedPoints: 20,
    percentage: 66.67,
  });
  expect({ items, answers: f.answers }).toEqual(source);
  expect(JSON.stringify(result)).not.toContain('PRIVATE_ANSWER_EXPLANATION');
  expect(JSON.stringify(result)).not.toContain(f.proof.definition.explanation);
  expect(result).not.toHaveProperty('score');
  expect(proofSubmissionResultSchema.parse(JSON.parse(JSON.stringify(result)))).toEqual(result);
});

test.each(['incorrect', 'missing', 'unused_error', 'unassessable'] as const)(
  '%s proof evidence preserves pending points and an unfinished assignment total',
  (kind) => {
    const f = fixture();
    const work: Record<string, unknown> = structuredClone(f.answers);
    const answer = f.answers[f.proof.id]!;
    if (answer.type !== 'derivation') throw new Error('Expected proof work');
    if (kind === 'incorrect') answer.proof.steps[1]!.formula = 'Q';
    if (kind === 'unused_error')
      answer.proof.steps.splice(1, 0, {
        kind: 'inference',
        id: randomUUID(),
        blockId: null,
        formula: 'Q',
        ruleId: null,
        lineReferences: [],
        subproofReferences: [],
      });
    if (kind === 'unassessable') answer.proof.steps[1]!.formula = '!'.repeat(33) + 'P';
    if (kind === 'missing') delete work[f.proof.id];
    else work[f.proof.id] = answer;
    const result = evaluateProofSubmission([f.proof, f.truth], work);
    const item = result.items[0]!;
    if (item.type !== 'derivation') throw new Error('Expected proof');
    expect(item.report.status).toBe(kind === 'unassessable' ? 'unassessable' : 'needs_review');
    if (kind === 'unused_error') expect(item.report.target).toBe('established');
    if (kind === 'unassessable')
      expect(
        item.report.diagnostics.some((diagnostic) => diagnostic.code === 'RESOURCE_LIMIT'),
      ).toBe(true);
    const score = scoreProofSubmission(f.allocations, result);
    expect(score.items[0]).toMatchObject({ status: 'needs_review', earnedPoints: null });
    expect(score.items[1]).toMatchObject({ status: 'graded', earnedPoints: 0 });
    expect(score.summary).toEqual({
      status: 'needs_review',
      maxPoints: 30,
      earnedPoints: null,
      percentage: null,
    });
  },
);

test('proof-only assignments have no invented correctness units and repeated versions stay separate occurrences', () => {
  const f = fixture();
  const repeated = { ...f.proof, id: randomUUID() };
  const result = evaluateProofSubmission([f.proof, repeated], {
    [f.proof.id]: f.answers[f.proof.id],
  });
  expect(result.summary.objective).toEqual({ correct: 0, incorrect: 0, unanswered: 0, total: 0 });
  expect(result.summary.proofs).toEqual({ accepted: 1, needsReview: 1, unassessable: 0, total: 2 });
  expect(result.items.map((item) => item.itemId)).toEqual([f.proof.id, repeated.id]);
  const score = scoreProofSubmission(
    [
      { itemId: f.proof.id, maxPoints: 5 },
      { itemId: repeated.id, maxPoints: 30 },
    ],
    result,
  );
  expect(score.items[0]).toMatchObject({ earnedPoints: 5 });
  expect(score.items[1]).toMatchObject({ earnedPoints: null });
  expect(score.summary.status).toBe('needs_review');
});

test('truth-table objective scoring retains existing partial correctness rounding in proof-containing work', () => {
  const f = fixture();
  const table: ProofSubmissionOccurrence = {
    id: randomUUID(),
    problemVersionId: randomUUID(),
    definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
  };
  const generated = generateTruthTable('P');
  const column = generated.columns.find((column) => column.kind === 'answer')!;
  const row = generated.rows[0]!;
  const result = evaluateProofSubmission([table, f.proof], {
    [f.proof.id]: f.answers[f.proof.id],
    [table.id]: [{ rowId: row.id, columnId: column.id, value: row.values[column.id]! }],
  });
  expect(result.items[0]).toMatchObject({
    type: 'truth_table',
    feedback: { summary: { correct: 1, unanswered: 1, total: 2 } },
  });
  const score = scoreProofSubmission(
    [
      { itemId: table.id, maxPoints: 7 },
      { itemId: f.proof.id, maxPoints: 20 },
    ],
    result,
  );
  expect(score.summary).toEqual({
    status: 'graded',
    maxPoints: 27,
    earnedPoints: 23.5,
    percentage: 87.04,
  });
});

test('multiple-choice work uses its existing key validation and independent one-response score', () => {
  const f = fixture();
  const a = randomUUID(),
    b = randomUUID();
  const choice: ProofSubmissionOccurrence = {
    id: randomUUID(),
    problemVersionId: randomUUID(),
    definition: {
      type: 'multiple_choice',
      definitionVersion: 1,
      question: 'Which?',
      options: [
        { id: a, text: 'One' },
        { id: b, text: 'Two' },
      ],
      correctOptionId: a,
    },
  };
  const work = {
    [f.proof.id]: f.answers[f.proof.id],
    [choice.id]: { type: 'multiple_choice', optionId: a },
  };
  const result = evaluateProofSubmission([f.proof, choice], work);
  expect(result.summary.objective.correct).toBe(1);
  expect(
    scoreProofSubmission(
      [
        { itemId: f.proof.id, maxPoints: 20 },
        { itemId: choice.id, maxPoints: 5 },
      ],
      result,
    ).summary,
  ).toMatchObject({ earnedPoints: 25, percentage: 100 });
  expect(() =>
    evaluateProofSubmission([f.proof, choice], {
      ...work,
      [choice.id]: { type: 'multiple_choice', optionId: randomUUID() },
    }),
  ).toThrow(StudentWorkError);
});

test.each([
  'foreign_response',
  'duplicate_item',
  'mismatched_type',
  'invalid_version',
  'duplicate_case_key',
] as const)('rejects %s before returning grading evidence', (kind) => {
  const f = fixture();
  let items: ProofSubmissionOccurrence[] = [f.proof, f.truth];
  let work: unknown = f.answers;
  if (kind === 'foreign_response') work = { ...f.answers, [randomUUID()]: f.answers[f.proof.id] };
  if (kind === 'duplicate_item') items = [f.proof, f.proof];
  if (kind === 'mismatched_type')
    work = { ...f.answers, [f.proof.id]: { type: 'true_false', answer: false } };
  if (kind === 'invalid_version') items = [{ ...f.proof, problemVersionId: 'not-an-id' }];
  if (kind === 'duplicate_case_key') {
    // Pick an occurrence UUID containing letters so its uppercase spelling is a distinct key.
    f.proof.id = 'abcdefab-cdef-4abc-8def-abcdefabcdef';
    work = {
      [f.proof.id]: f.answers[Object.keys(f.answers)[0]!]!,
      [f.proof.id.toUpperCase()]: f.answers[Object.keys(f.answers)[0]!]!,
    };
  }
  expect(() => evaluateProofSubmission(items, work)).toThrow(StudentWorkError);
});

test.each(['summary', 'proof_counts', 'duplicate', 'client_score'] as const)(
  'retained result contracts reject inconsistent %s',
  (kind) => {
    const f = fixture();
    const result = evaluateProofSubmission([f.proof, f.truth], f.answers);
    const forged = structuredClone(result);
    if (kind === 'summary') forged.summary.objective.correct++;
    if (kind === 'proof_counts') forged.summary.proofs.accepted++;
    if (kind === 'duplicate') forged.items.push(forged.items[0]!);
    expect(
      proofSubmissionResultSchema.safeParse(
        kind === 'client_score' ? { ...forged, earnedPoints: 100 } : forged,
      ).success,
    ).toBe(false);
    expect(() =>
      scoreProofSubmission(
        f.allocations,
        kind === 'client_score' ? { ...forged, earnedPoints: 100 } : forged,
      ),
    ).toThrow(AssignmentScoringError);
  },
);

test('allocation mismatches and objective-only use are rejected while proof-aware saved contracts accept final evidence', () => {
  const f = fixture();
  const result = evaluateProofSubmission([f.proof, f.truth], f.answers);
  expect(() => scoreProofSubmission([f.allocations[0]!], result)).toThrow(AssignmentScoringError);
  expect(() => evaluateProofSubmission([f.truth], { [f.truth.id]: f.answers[f.truth.id] })).toThrow(
    StudentWorkError,
  );
  expect(submissionResultSchema.safeParse(result).success).toBe(false);
  expect(
    savedStudentAttemptSchema.safeParse({
      id: randomUUID(),
      revision: 1,
      answers: f.answers,
      submittedAt: new Date().toISOString(),
      result,
      score: scoreProofSubmission(f.allocations, result),
    }).success,
  ).toBe(true);
});
