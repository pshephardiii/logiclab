import { randomUUID } from 'node:crypto';
import type {
  ProofSubmissionResult as StoredResult,
  ProofCompletionSubmissionResult as StoredCompletion,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import {
  proofSubmissionResultSchema,
  proofCompletionSubmissionResultSchema,
  summarizeProofCompletionVerification,
} from '@logiclab/contracts/proof-submission';
import {
  truthTreeDefinitionFixture,
  truthTreeShortCounterexampleFixture,
} from '../../../test/truth-tree-fixture';
import { derivationDefinitionFixture } from '../../../test/derivation-fixture';
import { evaluateProofSubmission } from './proof-submission';
import { evaluateProofCompletion } from './proof-completion';
import { scoreProofSubmission, validateProofSubmissionScore } from '../assignment/proof-scoring';
import { assignmentAdmissionDefinition } from '../assignment/definition-support';
import {
  checkTruthTreeReference,
  hasFinishedTruthTreeReference,
} from '../problem/truth-tree/authoring';

function fixture(outcome: 'valid' | 'invalid' = 'valid') {
  const definition = truthTreeDefinitionFixture(outcome);
  const tree = { id: randomUUID(), problemVersionId: randomUUID(), definition };
  const derivation = {
    id: randomUUID(),
    problemVersionId: randomUUID(),
    definition: derivationDefinitionFixture(),
  };
  const question = {
    id: randomUUID(),
    problemVersionId: randomUUID(),
    definition: {
      type: 'true_false' as const,
      definitionVersion: 1 as const,
      question: 'Concept?',
      correctAnswer: false,
    },
  };
  const answers = {
    [tree.id]: { type: 'truth_tree' as const, tree: definition.referenceTree!, verdict: outcome },
    [derivation.id]: { type: 'derivation' as const, proof: derivation.definition.referenceProof! },
    [question.id]: { type: 'true_false' as const, answer: false },
  };
  const items = [question, tree, derivation];
  return {
    tree,
    derivation,
    question,
    items,
    answers,
    allocations: items.map((item) => ({ itemId: item.id, maxPoints: 10 })),
  };
}

test.each(['valid', 'invalid'] as const)(
  'mixed graded %s truth trees preserve checker semantics, exact storage types and full allocations',
  (outcome) => {
    const f = fixture(outcome);
    const before = structuredClone(f);
    const result = evaluateProofSubmission(f.items, f.answers);
    expect(result.items.map((item) => item.itemId)).toEqual(f.items.map((item) => item.id));
    expect(result.items[1]).toMatchObject({
      type: 'truth_tree',
      problemVersionId: f.tree.problemVersionId,
      report: { status: 'verified', argumentStatus: outcome },
    });
    expect(result.summary).toEqual({
      objective: { correct: 1, incorrect: 0, unanswered: 0, total: 1 },
      proofs: { accepted: 2, needsReview: 0, unassessable: 0, total: 2 },
    });
    const stored: StoredResult = result;
    const transported: typeof result = stored;
    expect(proofSubmissionResultSchema.parse(JSON.parse(JSON.stringify(transported)))).toEqual(
      result,
    );
    const score = scoreProofSubmission(f.allocations, result);
    expect(score.summary).toMatchObject({ status: 'graded', earnedPoints: 30, percentage: 100 });
    expect(validateProofSubmissionScore(result, score)).toEqual(score);
    expect(JSON.stringify(result)).not.toContain('PRIVATE_TRUTH_TREE_EXPLANATION');
    expect(result.items[1]).not.toHaveProperty('referenceTree');
    expect(f).toEqual(before);
  },
);

test.each(['missing', 'incorrect', 'unassessable'] as const)(
  '%s tree work keeps the assignment pending without changing other points',
  (kind) => {
    const f = fixture();
    const answers: Record<string, unknown> = structuredClone(f.answers);
    if (kind === 'missing') delete answers[f.tree.id];
    if (kind === 'incorrect')
      answers[f.tree.id] = {
        type: 'truth_tree',
        tree: { ...f.tree.definition.referenceTree!, occurrences: [] },
      };
    if (kind === 'unassessable') f.tree.definition.conclusion = 'P &';
    const result = evaluateProofSubmission(f.items, answers);
    const score = scoreProofSubmission(f.allocations, result);
    expect(score.items.find((item) => item.itemId === f.tree.id)).toMatchObject({
      status: 'needs_review',
      earnedPoints: null,
    });
    expect(
      score.items
        .filter((item) => item.itemId !== f.tree.id)
        .every((item) => item.earnedPoints === 10),
    ).toBe(true);
    expect(score.summary).toMatchObject({
      status: 'needs_review',
      earnedPoints: null,
      percentage: null,
    });
    expect(result.summary.proofs.accepted).toBe(1);
    expect(result.summary.proofs[kind === 'unassessable' ? 'unassessable' : 'needsReview']).toBe(1);
    expect(
      proofSubmissionResultSchema.safeParse({
        ...result,
        summary: { ...result.summary, proofs: { ...result.summary.proofs, accepted: 2 } },
      }).success,
    ).toBe(false);
  },
);

test('completion retains finished incorrect tree diagnostics without points and validates summaries', () => {
  const f = fixture('invalid');
  f.tree.definition.referenceTree!.branches[0]!.ending = {
    kind: 'closed',
    closure: {
      kind: 'complement',
      occurrenceIds: f.tree.definition.referenceTree!.occurrences.map((item) => item.id) as [
        string,
        string,
      ],
    },
  };
  const result = evaluateProofCompletion(f.items, f.answers);
  expect(result.items[1]).toMatchObject({
    type: 'truth_tree',
    completedResponses: 1,
    totalResponses: 1,
    report: { status: 'invalid' },
  });
  expect(result.summary).toEqual({
    completedResponses: 3,
    totalResponses: 3,
    proofVerification: { verified: 1, errorsFound: 1, unavailable: 0, total: 2 },
  });
  expect(summarizeProofCompletionVerification(result.items)).toEqual(
    result.summary.proofVerification,
  );
  const stored: StoredCompletion = result;
  const transported: typeof result = stored;
  expect(
    proofCompletionSubmissionResultSchema.parse(JSON.parse(JSON.stringify(transported))),
  ).toEqual(result);
  expect(() => scoreProofSubmission(f.allocations, result)).toThrow();
  expect(
    proofCompletionSubmissionResultSchema.safeParse({
      ...result,
      summary: {
        ...result.summary,
        proofVerification: { verified: 2, errorsFound: 0, unavailable: 0, total: 2 },
      },
    }).success,
  ).toBe(false);
});

test('a verified tree with a wrong verdict remains reviewable in graded and completion summaries', () => {
  const f = fixture('valid');
  const answers = {
    ...f.answers,
    [f.tree.id]: {
      type: 'truth_tree',
      tree: f.tree.definition.referenceTree!,
      verdict: 'invalid',
    },
  };

  const graded = evaluateProofSubmission(f.items, answers);
  expect(graded.items[1]).toMatchObject({
    report: { status: 'verified' },
    verdict: { answer: 'invalid', status: 'incorrect' },
  });
  expect(graded.summary.proofs).toEqual({
    accepted: 1,
    needsReview: 1,
    unassessable: 0,
    total: 2,
  });
  expect(scoreProofSubmission(f.allocations, graded).summary.status).toBe('needs_review');

  const completion = evaluateProofCompletion(f.items, answers);
  expect(completion.summary.proofVerification).toEqual({
    verified: 1,
    errorsFound: 1,
    unavailable: 0,
    total: 2,
  });
  expect(
    proofCompletionSubmissionResultSchema.safeParse({
      ...completion,
      summary: {
        ...completion.summary,
        proofVerification: { verified: 2, errorsFound: 0, unavailable: 0, total: 2 },
      },
    }).success,
  ).toBe(false);
});

test('unfinished/mistyped/foreign tree answers cannot become completion or trusted results', () => {
  const f = fixture();
  for (const value of [
    undefined,
    {
      type: 'truth_tree',
      tree: {
        treeVersion: 1,
        format: 'truth_tree',
        rootBranchId: null,
        occurrences: [],
        branches: [],
        expansions: [],
      },
    },
  ]) {
    const answers: Record<string, unknown> = { ...f.answers };
    if (value === undefined) delete answers[f.tree.id];
    else answers[f.tree.id] = value;
    expect(() => evaluateProofCompletion(f.items, answers)).toThrow('incomplete_work');
  }
  expect(() =>
    evaluateProofSubmission(f.items, { ...f.answers, [f.tree.id]: f.answers[f.question.id] }),
  ).toThrow('invalid_answer');
  expect(() =>
    evaluateProofSubmission(f.items, { ...f.answers, [randomUUID()]: f.answers[f.tree.id] }),
  ).toThrow('invalid_answer');
});

test('a short verified counterexample is graded/practice-ready but cannot qualify as a completion-only reference', () => {
  const definition = truthTreeShortCounterexampleFixture();
  expect(checkTruthTreeReference(definition)).toMatchObject({
    status: 'checked',
    report: { status: 'verified', argumentStatus: 'invalid' },
  });
  expect(hasFinishedTruthTreeReference(definition)).toBe(false);
  for (const assessmentMode of ['graded', 'ungraded_practice'])
    expect(() =>
      assignmentAdmissionDefinition(definition, {
        assessmentMode,
        feedbackTiming: assessmentMode === 'graded' ? 'on_submission' : 'on_check',
      }),
    ).not.toThrow();
  expect(() =>
    assignmentAdmissionDefinition(definition, {
      assessmentMode: 'completion_only',
      feedbackTiming: 'on_submission',
    }),
  ).toThrow('truth_tree_reference_incomplete');
  for (const outcome of ['valid', 'invalid'] as const)
    expect(hasFinishedTruthTreeReference(truthTreeDefinitionFixture(outcome))).toBe(true);
  expect(() =>
    evaluateProofCompletion([{ id: randomUUID(), problemVersionId: randomUUID(), definition }], {}),
  ).toThrow('incomplete_work');
});
