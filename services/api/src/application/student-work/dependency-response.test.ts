import { randomUUID } from 'node:crypto';
import {
  dependencyDerivationAnswerSchema,
  saveDependencyAnswersSchema,
  checkDependencyAnswersSchema,
  type DependencyDerivationAnswer,
} from '@logiclab/contracts/dependency-derivation-work';
import type { DependencyDerivationAnswer as StoredAnswer } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import { PROOF_LIMITS, proofCheckReportSchema } from '@logiclab/contracts';
import {
  derivationAnswerSchema,
  derivationEvaluationEvidenceSchema,
} from '@logiclab/contracts/derivation-work';
import {
  savedStudentResponsesSchema,
  savedStudentAnswersSchema,
  savedStudentCheckSchema,
} from '@logiclab/contracts/saved-student-work';
import {
  dependencyDefinitionFixture,
  derivationDefinitionFixture,
} from '../../../test/derivation-fixture';
import { dependencyContent } from '../problem/derivation/dependency/authoring';
import { evaluateDependencyAnswer, validateDependencyAnswer } from './dependency-response';
import { validateDerivationAnswer } from './derivation-response';
import { StudentWorkError } from './errors';

type Assert<T extends true> = T;
type AnswerTypesMatch = Assert<
  StoredAnswer extends DependencyDerivationAnswer
    ? DependencyDerivationAnswer extends StoredAnswer
      ? true
      : false
    : false
>;
function fixture() {
  const definition = dependencyDefinitionFixture();
  const answer: DependencyDerivationAnswer = {
    type: 'derivation',
    proof: definition.referenceProof!,
  };
  const authoritative = {
    itemId: randomUUID(),
    problemVersionId: randomUUID(),
    content: dependencyContent(definition),
  };
  return { definition, answer, authoritative };
}

test('exact student JSON round-trips stable dependency/discharge identities without borrowing the reference object', () => {
  const { answer, authoritative } = fixture();
  const stored: StoredAnswer = dependencyDerivationAnswerSchema.parse(
    JSON.parse(JSON.stringify(answer)),
  );
  expect(stored).toEqual(answer);
  expect(
    saveDependencyAnswersSchema.parse({
      revision: 0,
      itemId: authoritative.itemId,
      answers: stored,
    }).answers,
  ).toEqual(answer);
  expect(
    checkDependencyAnswersSchema.parse({ itemId: authoritative.itemId, answers: answer }).answers,
  ).toEqual(answer);
  const parsed = validateDependencyAnswer(answer);
  parsed.proof.steps[0]!.formula = 'Q';
  expect(answer.proof.steps[0]!.formula).toBe('P');
});

test('validation retains unfinished and logically invalid drafts without checking, rewriting or normalizing annotations', () => {
  const { answer } = fixture();
  answer.proof.steps[0]!.formula = 'P &';
  answer.proof.steps[0]!.dependencies = [];
  const step = answer.proof.steps[1]!;
  if (step.kind !== 'inference') throw new Error('Expected inference');
  step.ruleId = null;
  step.formula = '';
  step.dependencies = [randomUUID(), randomUUID()];
  step.lineReferences = [randomUUID()];
  step.discharges = [{ assumptionId: null, conclusionId: null }];
  const before = structuredClone(answer);
  expect(validateDependencyAnswer(answer)).toEqual(before);
  expect(answer).toEqual(before);
  expect(
    validateDependencyAnswer({
      type: 'derivation',
      proof: { proofVersion: 1, format: 'dependency', steps: [] },
    }).proof.steps,
  ).toEqual([]);
});

test.each([
  'report',
  'referenceProof',
  'problem',
  'permittedRuleIds',
  'accepted',
  'score',
  'explanation',
  'itemId',
])('rejects injected %s at student answer and proof boundaries', (field) => {
  const { answer } = fixture();
  expect(() => validateDependencyAnswer({ ...answer, [field]: 'private or forged' })).toThrow(
    StudentWorkError,
  );
  expect(() =>
    validateDependencyAnswer({
      ...answer,
      proof: { ...answer.proof, [field]: 'private or forged' },
    }),
  ).toThrow(StudentWorkError);
});

test.each([
  'steps',
  'formula',
  'dependencies',
  'citations',
  'discharges',
  'version',
  'format',
  'identity',
])('transport bounds reject malformed or excessive %s', (kind) => {
  const { answer } = fixture();
  const proof = structuredClone(answer.proof) as Record<string, unknown>;
  const inference = answer.proof.steps[1]!;
  if (kind === 'steps')
    proof.steps = Array.from({ length: PROOF_LIMITS.maxSteps + 1 }, () => answer.proof.steps[0]);
  if (kind === 'formula')
    proof.steps = [
      { ...answer.proof.steps[0], formula: 'P'.repeat(PROOF_LIMITS.maxFormulaLength + 1) },
    ];
  if (kind === 'dependencies')
    proof.steps = [
      {
        ...inference,
        dependencies: Array.from({ length: PROOF_LIMITS.maxSteps + 1 }, () => randomUUID()),
      },
    ];
  if (kind === 'citations')
    proof.steps = [{ ...inference, lineReferences: [randomUUID(), randomUUID(), randomUUID()] }];
  if (kind === 'discharges')
    proof.steps = [
      {
        ...inference,
        discharges: Array.from({ length: 3 }, () => ({ assumptionId: null, conclusionId: null })),
      },
    ];
  if (kind === 'version') proof.proofVersion = 2;
  if (kind === 'format') proof.format = 'tree';
  if (kind === 'identity') proof.steps = [{ ...answer.proof.steps[0], id: 'bad' }];
  expect(() => validateDependencyAnswer({ ...answer, proof })).toThrow(StudentWorkError);
});

test.each([-1, 0.5, 2147483647, '0', null])(
  'save requests reject invalid revision %s',
  (revision) => {
    const { answer, authoritative } = fixture();
    expect(
      saveDependencyAnswersSchema.safeParse({
        revision,
        itemId: authoritative.itemId,
        answers: answer,
      }).success,
    ).toBe(false);
  },
);

test('request metadata rejects replacement statements, foreign fields and missing item identities', () => {
  const { answer, authoritative } = fixture();
  expect(checkDependencyAnswersSchema.safeParse({ answers: answer }).success).toBe(false);
  expect(checkDependencyAnswersSchema.safeParse({ itemId: 'bad', answers: answer }).success).toBe(
    false,
  );
  expect(
    checkDependencyAnswersSchema.safeParse({
      itemId: authoritative.itemId,
      answers: answer,
      problem: authoritative.content,
    }).success,
  ).toBe(false);
  expect(
    saveDependencyAnswersSchema.safeParse({
      revision: 0,
      itemId: authoritative.itemId,
      answers: answer,
      accepted: true,
    }).success,
  ).toBe(false);
});

test('evaluation uses pinned statement/rules and returns bounded evidence without a reference, explanation or numerical award', () => {
  const { authoritative, answer } = fixture();
  const before = structuredClone({ authoritative, answer });
  const evidence = evaluateDependencyAnswer(authoritative, answer);
  expect(evidence).toMatchObject({
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    report: { status: 'accepted', target: 'established' },
  });
  expect(derivationEvaluationEvidenceSchema.parse(evidence)).toEqual(evidence);
  expect(proofCheckReportSchema.parse(evidence.report)).toEqual(evidence.report);
  expect(Object.keys(evidence).sort()).toEqual([
    'evaluationVersion',
    'itemId',
    'problemVersionId',
    'report',
    'type',
  ]);
  expect(JSON.stringify(evidence)).not.toContain('Assuming P permits');
  expect({ authoritative, answer }).toEqual(before);
  expect(
    evaluateDependencyAnswer(
      { ...authoritative, content: { ...authoritative.content, conclusion: 'Q' } },
      answer,
    ).report.status,
  ).toBe('needs_review');
  expect(
    evaluateDependencyAnswer(
      { ...authoritative, content: { ...authoritative.content, rules: [] } },
      answer,
    ).report.status,
  ).toBe('needs_review');
});

test('incorrect and incomplete work needs review while invalid problem syntax remains unassessable', () => {
  const { authoritative, answer } = fixture();
  const wrong = structuredClone(answer);
  wrong.proof.steps[1]!.dependencies = [wrong.proof.steps[0]!.id];
  expect(evaluateDependencyAnswer(authoritative, wrong).report.status).toBe('needs_review');
  const incomplete = { ...answer, proof: { ...answer.proof, steps: [] } };
  expect(evaluateDependencyAnswer(authoritative, incomplete).report.status).toBe('needs_review');
  expect(
    evaluateDependencyAnswer(
      { ...authoritative, content: { ...authoritative.content, conclusion: 'P &' } },
      answer,
    ).report.status,
  ).toBe('unassessable');
});

test('premise correspondence is authoritative even when student annotations and inference are locally plausible', () => {
  const { authoritative, answer } = fixture();
  const premiseId = randomUUID();
  const id = randomUUID();
  const content = {
    ...authoritative.content,
    premises: [{ id: premiseId, formula: 'P' }],
    conclusion: 'Q',
  };
  const forged = {
    ...answer,
    proof: {
      ...answer.proof,
      steps: [{ kind: 'premise', id, premiseId, formula: 'Q', dependencies: [id] }],
    },
  };
  expect(evaluateDependencyAnswer({ ...authoritative, content }, forged).report.status).toBe(
    'needs_review',
  );
});

test('formats and live saved-work admission stay distinct while dependency support is staged', () => {
  const { authoritative, answer } = fixture();
  const fitch = { type: 'derivation', proof: derivationDefinitionFixture().referenceProof };
  expect(() => validateDependencyAnswer(fitch)).toThrow(StudentWorkError);
  expect(() => validateDerivationAnswer(answer)).toThrow(StudentWorkError);
  expect(derivationAnswerSchema.safeParse(answer).success).toBe(false);
  expect(savedStudentResponsesSchema.safeParse({ [authoritative.itemId]: answer }).success).toBe(
    false,
  );
  expect(
    savedStudentAnswersSchema.safeParse({
      revision: 0,
      itemId: authoritative.itemId,
      answers: answer,
    }).success,
  ).toBe(false);
  expect(
    savedStudentCheckSchema.safeParse({ itemId: authoritative.itemId, answers: answer }).success,
  ).toBe(false);
});

test('authoritative content cannot contain a private reference or unsupported configuration', () => {
  const { authoritative, answer, definition } = fixture();
  for (const content of [
    definition,
    { ...authoritative.content, checkerVersion: 2 },
    { ...authoritative.content, rules: [{ id: 'custom_rule', label: 'MP' }] },
    { ...authoritative.content, format: 'fitch' },
  ]) {
    // Exercise the runtime boundary as a malformed persisted/caller-supplied statement.
    expect(() =>
      evaluateDependencyAnswer(
        { ...authoritative, content: content as typeof authoritative.content },
        answer,
      ),
    ).toThrow();
  }
});
