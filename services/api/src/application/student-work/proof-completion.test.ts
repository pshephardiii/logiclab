import { randomUUID } from 'node:crypto';
import {
  proofCompletionSubmissionResultSchema,
  proofSubmissionResultSchema,
  proofCompletionVerification,
  summarizeProofCompletionVerification,
} from '@logiclab/contracts/proof-submission';
import { submissionResultSchema } from '@logiclab/contracts';
import { savedStudentAttemptSchema } from '@logiclab/contracts/saved-student-work';
import { generateTruthTable } from '@logiclab/logic-engine';
import { derivationDefinitionFixture } from '../../../test/derivation-fixture';
import { evaluateProofCompletion } from './proof-completion';
import type { ProofSubmissionOccurrence } from './proof-work';
import { StudentWorkError } from './errors';

function fixture() {
  const definition = derivationDefinitionFixture();
  const proof: ProofSubmissionOccurrence = {
    id: randomUUID(),
    problemVersionId: randomUUID(),
    definition,
  };
  const question: ProofSubmissionOccurrence = {
    id: randomUUID(),
    problemVersionId: randomUUID(),
    definition: {
      type: 'true_false',
      definitionVersion: 1,
      question: 'Always?',
      correctAnswer: true,
      explanation: 'PRIVATE_CONCEPTUAL_KEY',
    },
  };
  const answer = {
    type: 'derivation' as const,
    proof: structuredClone(definition.referenceProof!),
  };
  return {
    proof,
    question,
    answer,
    answers: { [proof.id]: answer, [question.id]: { type: 'true_false' as const, answer: false } },
  };
}
const incomplete = (error: unknown) =>
  error instanceof StudentWorkError && error.reason === 'incomplete_work';

test('score-free completion retains fresh proof diagnostics and provenance while objective correctness stays undisclosed', () => {
  const f = fixture();
  // A filled but incorrect conditional proof is completed work, not automatically awarded credit.
  f.answer.proof.steps[0]!.formula = 'Q';
  const source = structuredClone(f);
  const result = evaluateProofCompletion([f.question, f.proof], f.answers);
  expect(result.summary).toMatchObject({ completedResponses: 2, totalResponses: 2 });
  expect(result.items[0]).toEqual({
    itemId: f.question.id,
    type: 'true_false',
    completedResponses: 1,
    totalResponses: 1,
  });
  expect(result.items[1]).toMatchObject({
    type: 'derivation',
    itemId: f.proof.id,
    problemVersionId: f.proof.problemVersionId,
    report: { status: 'needs_review' },
    completedResponses: 1,
    totalResponses: 1,
  });
  const serialized = JSON.stringify(result);
  for (const field of [
    'referenceProof',
    'explanation',
    'correctAnswer',
    'score',
    'earnedPoints',
    'PRIVATE_CONCEPTUAL_KEY',
  ])
    expect(serialized).not.toContain(field);
  expect(f).toEqual(source);
  expect(proofCompletionSubmissionResultSchema.parse(JSON.parse(serialized))).toEqual(result);
  expect(proofSubmissionResultSchema.safeParse(result).success).toBe(false);
});
test('an accepted proof completes one response unit regardless of its length, with independent repeated occurrences', () => {
  const f = fixture();
  const repeated = { ...f.proof, id: randomUUID() };
  const result = evaluateProofCompletion([repeated, f.proof], {
    ...{ [f.proof.id]: f.answer },
    [repeated.id]: f.answer,
  });
  expect(result.summary).toMatchObject({ completedResponses: 2, totalResponses: 2 });
  expect(result.items.map((item) => item.itemId)).toEqual([repeated.id, f.proof.id]);
  expect(
    result.items.every((item) => item.type === 'derivation' && item.report.status === 'accepted'),
  ).toBe(true);
});
test.each(['missing', 'empty', 'open_block', 'missing_rule', 'wrong_target'] as const)(
  '%s work cannot finalize completion and leaves inputs unchanged',
  (kind) => {
    const f = fixture();
    const input: Record<string, unknown> = { ...f.answers };
    if (kind === 'missing') delete input[f.proof.id];
    if (kind === 'empty') f.answer.proof.steps = [];
    if (kind === 'open_block') f.answer.proof.blocks[0]!.endId = null;
    const last = f.answer.proof.steps.at(-1);
    if (kind === 'missing_rule' && last?.kind === 'inference') last.ruleId = null;
    if (kind === 'wrong_target' && last) last.formula = 'Q';
    const before = structuredClone(input);
    expect(() => evaluateProofCompletion([f.proof, f.question], input)).toThrow(StudentWorkError);
    try {
      evaluateProofCompletion([f.proof, f.question], input);
    } catch (error) {
      expect(incomplete(error)).toBe(true);
    }
    expect(input).toEqual(before);
  },
);
test('every objective answer must be filled, while false and incorrect table entries still count as completion', () => {
  const f = fixture();
  const table: ProofSubmissionOccurrence = {
    id: randomUUID(),
    problemVersionId: randomUUID(),
    definition: { type: 'truth_table', definitionVersion: 1, formula: 'P & Q' },
  };
  const generated = generateTruthTable('P & Q');
  const cells = generated.rows.flatMap((row) =>
    generated.columns
      .filter((column) => column.kind === 'answer')
      .map((column) => ({ rowId: row.id, columnId: column.id, value: false })),
  );
  const result = evaluateProofCompletion([f.proof, table], {
    [f.proof.id]: f.answer,
    [table.id]: cells,
  });
  expect(result.summary.totalResponses).toBe(cells.length + 1);
  expect(result.items[1]).toEqual({
    itemId: table.id,
    type: 'truth_table',
    completedResponses: cells.length,
    totalResponses: cells.length,
  });
  expect(() =>
    evaluateProofCompletion([f.proof, table], {
      [f.proof.id]: f.answer,
      [table.id]: cells.slice(1),
    }),
  ).toThrow(StudentWorkError);
  expect(() =>
    evaluateProofCompletion([f.proof, f.question], {
      [f.proof.id]: f.answer,
      [f.question.id]: { type: 'true_false', answer: null },
    }),
  ).toThrow(StudentWorkError);
});
test('foreign occurrence answers and injected reports/keys are not trusted as completion', () => {
  const f = fixture();
  for (const input of [
    { ...f.answers, [randomUUID()]: f.answer },
    { ...f.answers, [f.proof.id]: { ...f.answer, report: {} } },
    { ...f.answers, [f.proof.id]: { type: 'true_false', answer: true } },
  ])
    expect(() => evaluateProofCompletion([f.proof, f.question], input)).toThrow(StudentWorkError);
});
test('completion contracts reject score/key injection, duplicate occurrences and inconsistent counts; live storage remains guarded', () => {
  const f = fixture();
  const result = evaluateProofCompletion([f.proof, f.question], f.answers);
  for (const input of [
    { ...result, score: 100 },
    { ...result, summary: { completedResponses: 99, totalResponses: 99 } },
    { ...result, items: [result.items[0], result.items[0]] },
    { ...result, items: result.items.map((item) => ({ ...item, correctAnswer: true })) },
  ])
    expect(proofCompletionSubmissionResultSchema.safeParse(input).success).toBe(false);
  expect(submissionResultSchema.safeParse(result).success).toBe(false);
  expect(
    savedStudentAttemptSchema.safeParse({
      id: randomUUID(),
      revision: 1,
      answers: f.answers,
      submittedAt: new Date().toISOString(),
      result,
    }).success,
  ).toBe(false);
});

test('an invalid conclusion-only shortcut is completed but flagged separately from a verified attempt', () => {
  const premiseId = randomUUID();
  const stepId = randomUUID();
  const item: ProofSubmissionOccurrence = {
    id: randomUUID(),
    problemVersionId: randomUUID(),
    definition: {
      type: 'derivation',
      definitionVersion: 1,
      format: 'fitch',
      checkerVersion: 1,
      ruleCatalogVersion: 1,
      premises: [{ id: premiseId, formula: 'P' }],
      conclusion: 'P',
      rules: [{ id: 'reiteration', label: 'Repeat' }],
      referenceProof: null,
    },
  };
  // All fields are filled, but a self-citation does not justify this conclusion.
  const shortcut = {
    type: 'derivation',
    proof: {
      proofVersion: 1,
      format: 'fitch',
      blocks: [],
      steps: [
        {
          kind: 'inference',
          id: stepId,
          blockId: null,
          formula: 'P',
          ruleId: 'reiteration',
          lineReferences: [stepId],
          subproofReferences: [],
        },
      ],
    },
  };
  const invalid = evaluateProofCompletion([item], { [item.id]: shortcut });
  const correct = evaluateProofCompletion([item], {
    [item.id]: {
      type: 'derivation',
      proof: {
        proofVersion: 1,
        format: 'fitch',
        blocks: [],
        steps: [{ kind: 'premise', id: stepId, blockId: null, formula: 'P', premiseId }],
      },
    },
  });
  expect(invalid.summary).toEqual({
    completedResponses: 1,
    totalResponses: 1,
    proofVerification: { verified: 0, errorsFound: 1, unavailable: 0, total: 1 },
  });
  expect(correct.summary).toEqual({
    completedResponses: 1,
    totalResponses: 1,
    proofVerification: { verified: 1, errorsFound: 0, unavailable: 0, total: 1 },
  });
  const evidence = invalid.items[0]!;
  if (evidence.type !== 'derivation') throw new Error('Expected proof');
  expect(proofCompletionVerification(evidence.report)).toBe('errors_found');
  expect(
    evidence.report.diagnostics.some((diagnostic) => diagnostic.code === 'INVALID_REFERENCE'),
  ).toBe(true);
  expect(invalid).not.toHaveProperty('score');
});

test('resource-limited verification is flagged as unavailable without revoking finished-work completion', () => {
  const a = randomUUID();
  const b = randomUUID();
  const first = randomUUID();
  const second = randomUUID();
  const item: ProofSubmissionOccurrence = {
    id: randomUUID(),
    problemVersionId: randomUUID(),
    definition: {
      type: 'derivation',
      definitionVersion: 1,
      format: 'fitch',
      checkerVersion: 1,
      ruleCatalogVersion: 1,
      premises: [
        { id: a, formula: 'P' },
        { id: b, formula: 'Q' },
      ],
      conclusion: 'P & Q',
      rules: [{ id: 'and_introduction', label: 'Conjunction' }],
      referenceProof: null,
    },
  };
  const formula = Array(60).fill('P').join(' & ');
  const proof = {
    proofVersion: 1,
    format: 'fitch',
    blocks: [],
    steps: [
      { kind: 'premise', id: first, blockId: null, formula, premiseId: a },
      { kind: 'premise', id: second, blockId: null, formula, premiseId: b },
      ...Array.from({ length: 198 }, (_, index) => ({
        kind: 'inference',
        id: randomUUID(),
        blockId: null,
        formula: index === 197 ? 'P & Q' : formula,
        ruleId: 'and_introduction',
        lineReferences: [first, second],
        subproofReferences: [],
      })),
    ],
  };
  const result = evaluateProofCompletion([item], { [item.id]: { type: 'derivation', proof } });
  expect(result.summary).toEqual({
    completedResponses: 1,
    totalResponses: 1,
    proofVerification: { verified: 0, errorsFound: 0, unavailable: 1, total: 1 },
  });
  const evidence = result.items[0]!;
  if (evidence.type !== 'derivation') throw new Error('Expected proof');
  expect(proofCompletionVerification(evidence.report)).toBe('verification_unavailable');
  expect(
    evidence.report.diagnostics.some((diagnostic) => diagnostic.code === 'RESOURCE_LIMIT'),
  ).toBe(true);
});

test('mixed verification summaries flag individual occurrences and reject counts that conceal errors', () => {
  const f = fixture();
  const other = { ...f.proof, id: randomUUID() };
  const wrong = structuredClone(f.answer);
  wrong.proof.steps[0]!.formula = 'Q';
  const result = evaluateProofCompletion([f.proof, f.question, other], {
    ...f.answers,
    [other.id]: wrong,
  });
  expect(result.summary.proofVerification).toEqual({
    verified: 1,
    errorsFound: 1,
    unavailable: 0,
    total: 2,
  });
  expect(summarizeProofCompletionVerification(result.items)).toEqual(
    result.summary.proofVerification,
  );
  expect(
    result.items
      .filter((item) => item.type === 'derivation')
      .map((item) => proofCompletionVerification(item.report)),
  ).toEqual(['verified', 'errors_found']);
  for (const proofVerification of [
    { verified: 2, errorsFound: 0, unavailable: 0, total: 2 },
    { verified: 1, errorsFound: 1, unavailable: 0, total: 3 },
  ])
    expect(
      proofCompletionSubmissionResultSchema.safeParse({
        ...result,
        summary: { ...result.summary, proofVerification },
      }).success,
    ).toBe(false);
  expect(result.summary.completedResponses).toBe(3);
});
