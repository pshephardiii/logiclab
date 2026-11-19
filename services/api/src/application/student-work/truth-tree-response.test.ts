import {
  truthTreeAnswerSchema,
  saveTruthTreeAnswersSchema,
  checkTruthTreeAnswersSchema,
  truthTreeEvaluationEvidenceSchema,
  truthTreeCompletionEvidenceSchema,
} from '@logiclab/contracts/truth-tree-work';
import { savedStudentResponsesSchema } from '@logiclab/contracts/saved-student-work';
import { truthTreeDefinitionFixture, truthTreeIds } from '../../../test/truth-tree-fixture';
import { truthTreeContent } from '../problem/truth-tree/authoring';
import {
  validateTruthTreeAnswer,
  evaluateTruthTreeAnswer,
  evaluateTruthTreeCompletion,
} from './truth-tree-response';
import { StudentWorkError } from './errors';
import { truthTreeScoringOutcome } from '../assignment/truth-tree-scoring';
import { scoreAssignment, AssignmentScoringError } from '../assignment/scoring';

const itemId = 'e5555555-5555-4555-8555-555555555555';
const problemVersionId = 'f6666666-6666-4666-8666-666666666666';
function fixture(outcome: 'valid' | 'invalid' = 'valid') {
  const definition = truthTreeDefinitionFixture(outcome);
  return {
    authoritative: { itemId, problemVersionId, content: truthTreeContent(definition) },
    answer: { type: 'truth_tree' as const, tree: definition.referenceTree! },
  };
}

test.each(['valid', 'invalid'] as const)(
  '%s arguments evaluate against pinned content without instructor answers or input mutation',
  (outcome) => {
    const { authoritative, answer } = fixture(outcome);
    const before = structuredClone({ authoritative, answer });
    const evidence = evaluateTruthTreeAnswer(authoritative, answer);
    expect(truthTreeEvaluationEvidenceSchema.parse(JSON.parse(JSON.stringify(evidence)))).toEqual(
      evidence,
    );
    expect(evidence).toMatchObject({
      itemId,
      problemVersionId,
      evaluationVersion: 'truth_tree_v1',
      report: { status: 'verified', argumentStatus: outcome },
    });
    expect(JSON.stringify(evidence)).not.toContain('PRIVATE_TRUTH_TREE_EXPLANATION');
    expect(evidence).not.toHaveProperty('referenceTree');
    expect({ authoritative, answer }).toEqual(before);
  },
);

test('draft shape validation preserves incorrect/blank work without certifying it', () => {
  const { authoritative, answer } = fixture();
  answer.tree.occurrences[0]!.formula = '';
  expect(validateTruthTreeAnswer(answer)).toEqual(answer);
  expect(evaluateTruthTreeAnswer(authoritative, answer).report.status).not.toBe('verified');
});

test.each(['problem', 'referenceTree', 'report', 'score', 'argumentStatus'] as const)(
  'student answers cannot replace server-owned %s',
  (key) => {
    const { answer } = fixture();
    expect(() => validateTruthTreeAnswer({ ...answer, [key]: {} })).toThrow(StudentWorkError);
  },
);

test('save/check requests are bounded, revisioned and cannot carry a replacement statement', () => {
  const { answer } = fixture();
  expect(
    saveTruthTreeAnswersSchema.safeParse({ revision: 0, itemId, answers: answer }).success,
  ).toBe(true);
  expect(checkTruthTreeAnswersSchema.safeParse({ itemId, answers: answer }).success).toBe(true);
  for (const revision of [-1, 0.5, 2147483647])
    expect(
      saveTruthTreeAnswersSchema.safeParse({ revision, itemId, answers: answer }).success,
    ).toBe(false);
  expect(
    checkTruthTreeAnswersSchema.safeParse({ itemId, answers: answer, problem: {} }).success,
  ).toBe(false);
  expect(truthTreeAnswerSchema.safeParse({ type: 'derivation', proof: answer.tree }).success).toBe(
    false,
  );
  expect(
    truthTreeAnswerSchema.safeParse({ ...answer, tree: { ...answer.tree, format: 'tree' } })
      .success,
  ).toBe(false);
});

test('a changed authoritative conclusion cannot be replaced by the student tree’s original target', () => {
  const { authoritative, answer } = fixture();
  authoritative.content.conclusion = 'Q';
  const evidence = evaluateTruthTreeAnswer(authoritative, answer);
  expect(evidence.report.status).toBe('invalid');
  expect(evidence.report.argumentStatus).toBe('undetermined');
});

test.each(['valid', 'invalid'] as const)(
  'verified %s evidence earns full allocated points',
  (outcome) => {
    const { authoritative, answer } = fixture(outcome);
    const evidence = evaluateTruthTreeAnswer(authoritative, answer);
    const score = scoreAssignment([{ itemId, maxPoints: 20 }], [truthTreeScoringOutcome(evidence)]);
    expect(score.items[0]).toMatchObject({ status: 'graded', earnedPoints: 20 });
    expect(score.summary).toMatchObject({ status: 'graded', earnedPoints: 20, percentage: 100 });
  },
);

test('incorrect, incomplete and unassessable evidence remains nonnumeric pending review', () => {
  for (const kind of ['incorrect', 'incomplete', 'unassessable']) {
    const { authoritative, answer } = fixture();
    if (kind === 'incorrect')
      answer.tree.branches[0]!.ending = {
        kind: 'closed',
        closure: { kind: 'falsity', occurrenceId: truthTreeIds.premiseOccurrence },
      };
    if (kind === 'incomplete') answer.tree.rootBranchId = null;
    if (kind === 'unassessable') authoritative.content.conclusion = 'P &';
    const evidence = evaluateTruthTreeAnswer(authoritative, answer);
    const score = scoreAssignment([{ itemId, maxPoints: 20 }], [truthTreeScoringOutcome(evidence)]);
    expect(score.items[0]).toMatchObject({ status: 'needs_review', earnedPoints: null });
    expect(score.summary).toMatchObject({
      status: 'needs_review',
      earnedPoints: null,
      percentage: null,
    });
  }
});

test('completion retains incorrect verification and stays score-free', () => {
  const { authoritative, answer } = fixture();
  authoritative.content.conclusion = 'Q';
  answer.tree.occurrences[1]!.formula = '!Q';
  const completion = evaluateTruthTreeCompletion(authoritative, answer);
  expect(truthTreeCompletionEvidenceSchema.parse(completion)).toEqual(completion);
  expect(completion).toMatchObject({
    completedResponses: 1,
    totalResponses: 1,
    report: { status: 'invalid' },
  });
  expect(
    completion.report.steps.diagnostics.some((entry) => entry.code === 'INVALID_CLOSURE'),
  ).toBe(true);
  expect(completion).not.toHaveProperty('score');
  expect(completion).not.toHaveProperty('earnedPoints');
  expect(() => truthTreeScoringOutcome(completion)).toThrow(AssignmentScoringError);
});

test.each(['valid', 'invalid'] as const)(
  'finished %s completion retains verification without a grade',
  (outcome) => {
    const { authoritative, answer } = fixture(outcome);
    expect(evaluateTruthTreeCompletion(authoritative, answer)).toMatchObject({
      completedResponses: 1,
      totalResponses: 1,
      report: { status: 'verified', argumentStatus: outcome },
    });
  },
);

test('unfilled completion is rejected and repeated occurrences retain separate grading identities', () => {
  const { authoritative, answer } = fixture();
  answer.tree.branches[0]!.ending = { kind: 'closed', closure: null };
  expect(() => evaluateTruthTreeCompletion(authoritative, answer)).toThrow(
    expect.objectContaining({ reason: 'incomplete_work' }),
  );
  const valid = fixture('invalid');
  const first = evaluateTruthTreeAnswer(valid.authoritative, valid.answer);
  const secondId = 'a7777777-7777-4777-8777-777777777777';
  const second = evaluateTruthTreeAnswer(
    { ...valid.authoritative, itemId: secondId },
    valid.answer,
  );
  const score = scoreAssignment(
    [
      { itemId, maxPoints: 20 },
      { itemId: secondId, maxPoints: 5 },
    ],
    [truthTreeScoringOutcome(first), truthTreeScoringOutcome(second)],
  );
  expect(score.summary).toMatchObject({ earnedPoints: 25, percentage: 100 });
  valid.answer.tree.branches[0]!.ending = {
    kind: 'closed',
    closure: { kind: 'falsity', occurrenceId: truthTreeIds.premiseOccurrence },
  };
  const pending = evaluateTruthTreeAnswer(
    { ...valid.authoritative, itemId: secondId },
    valid.answer,
  );
  const pendingScore = scoreAssignment(
    [
      { itemId, maxPoints: 20 },
      { itemId: secondId, maxPoints: 5 },
    ],
    [truthTreeScoringOutcome(first), truthTreeScoringOutcome(pending)],
  );
  expect(pendingScore.items[0]).toMatchObject({ earnedPoints: 20 });
  expect(pendingScore.items[1]).toMatchObject({ status: 'needs_review', earnedPoints: null });
  expect(pendingScore.summary).toMatchObject({
    status: 'needs_review',
    earnedPoints: null,
    percentage: null,
  });
});

test('staged truth-tree responses still fail live saved-work admission', () => {
  const { answer } = fixture();
  expect(savedStudentResponsesSchema.safeParse({ [itemId]: answer }).success).toBe(false);
  expect(() => truthTreeScoringOutcome({ itemId, report: { status: 'verified' } })).toThrow(
    AssignmentScoringError,
  );
});
