import { randomUUID } from 'node:crypto';
import {
  saveDerivationAnswersSchema,
  checkDerivationAnswersSchema,
  derivationAnswerSchema,
  derivationEvaluationEvidenceSchema,
} from '@logiclab/contracts/derivation-work';
import {
  assignmentResponseValueSchema,
  saveStudentAnswersSchema,
  submissionResultSchema,
  PROOF_LIMITS,
} from '@logiclab/contracts';
import { derivationDefinitionFixture } from '../../../test/derivation-fixture';
import { derivationContent, DerivationAuthoringError } from '../problem/derivation-authoring';
import { supportedProblemDefinition } from '../problem/definition-support';
import { evaluateDerivationAnswer, validateDerivationAnswer } from './derivation-response';
import { StudentWorkError } from './errors';

function fixture() {
  const definition = derivationDefinitionFixture();
  const answer = { type: 'derivation' as const, proof: definition.referenceProof! };
  const authoritative = {
    itemId: randomUUID(),
    problemVersionId: randomUUID(),
    content: derivationContent(definition),
  };
  return { definition, answer, authoritative };
}

test('saved-proof validation retains incomplete/invalid work without checking or mutating it', () => {
  const { answer } = fixture();
  answer.proof.steps[0]!.formula = 'P &';
  answer.proof.blocks[0]!.endId = null;
  const original = structuredClone(answer);
  const parsed = validateDerivationAnswer(answer);
  expect(parsed).toEqual(original);
  expect(parsed).not.toBe(answer);
  parsed.proof.steps[0]!.formula = '';
  expect(answer).toEqual(original);
  expect(
    validateDerivationAnswer({
      type: 'derivation',
      proof: { proofVersion: 1, format: 'fitch', steps: [], blocks: [] },
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
])('rejects injected student-owned %s fields', (field) => {
  const { answer, authoritative } = fixture();
  expect(() => validateDerivationAnswer({ ...answer, [field]: authoritative.content })).toThrow(
    StudentWorkError,
  );
});

test.each([
  { revision: -1 },
  { revision: 2147483647 },
  { itemId: 'not-a-uuid' },
  { ownerId: randomUUID() },
  { problemVersionId: randomUUID() },
  { report: {} },
])('strict save envelopes reject invalid/spoofed metadata: %#', (patch) => {
  const { answer, authoritative } = fixture();
  expect(
    saveDerivationAnswersSchema.safeParse({
      revision: 0,
      itemId: authoritative.itemId,
      answers: answer,
      ...patch,
    }).success,
  ).toBe(false);
});

test('check envelopes accept only a target occurrence and student work', () => {
  const { answer, authoritative } = fixture();
  expect(
    checkDerivationAnswersSchema.parse({ itemId: authoritative.itemId, answers: answer }),
  ).toEqual({ itemId: authoritative.itemId, answers: answer });
  expect(
    checkDerivationAnswersSchema.safeParse({
      itemId: authoritative.itemId,
      answers: answer,
      problem: authoritative.content,
    }).success,
  ).toBe(false);
  expect(
    saveDerivationAnswersSchema.parse({
      revision: 2,
      itemId: authoritative.itemId,
      answers: answer,
    }).revision,
  ).toBe(2);
});

test.each(['steps', 'blocks', 'formula', 'references', 'version'] as const)(
  'proof saves enforce transport bounds: %s',
  (kind) => {
    const { answer } = fixture();
    const proof: Record<string, unknown> = structuredClone(answer.proof);
    if (kind === 'steps')
      proof.steps = Array.from({ length: PROOF_LIMITS.maxSteps + 1 }, () => answer.proof.steps[0]);
    if (kind === 'blocks')
      proof.blocks = Array.from(
        { length: PROOF_LIMITS.maxBlocks + 1 },
        () => answer.proof.blocks[0],
      );
    if (kind === 'formula')
      proof.steps = [
        { ...answer.proof.steps[0], formula: 'P'.repeat(PROOF_LIMITS.maxFormulaLength + 1) },
      ];
    if (kind === 'references')
      proof.steps = [
        { ...answer.proof.steps[1], lineReferences: [randomUUID(), randomUUID(), randomUUID()] },
      ];
    if (kind === 'version') proof.proofVersion = 2;
    expect(() => validateDerivationAnswer({ type: 'derivation', proof })).toThrow(StudentWorkError);
  },
);

test('evaluation binds freshly checked evidence to the supplied occurrence/version without reference leakage', () => {
  const { authoritative, answer, definition } = fixture();
  const snapshot = structuredClone({ authoritative, answer });
  const evidence = evaluateDerivationAnswer(authoritative, answer);
  expect(evidence).toMatchObject({
    evaluationVersion: 'derivation_v1',
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    report: { status: 'accepted', target: 'established' },
  });
  expect({ authoritative, answer }).toEqual(snapshot);
  expect(derivationEvaluationEvidenceSchema.parse(JSON.parse(JSON.stringify(evidence)))).toEqual(
    evidence,
  );
  expect(evidence).not.toHaveProperty('earnedPoints');
  expect(evidence).not.toHaveProperty('proof');
  expect(JSON.stringify(evidence)).not.toContain(definition.explanation);
  const repeated = evaluateDerivationAnswer({ ...authoritative, itemId: randomUUID() }, answer);
  expect(repeated.itemId).not.toBe(evidence.itemId);
  expect(repeated.report).toEqual(evidence.report);
});

test('target and rule permissions come from authoritative content, not the submitted proof or reference', () => {
  const { authoritative, answer, definition } = fixture();
  expect(
    evaluateDerivationAnswer(
      { ...authoritative, content: { ...authoritative.content, conclusion: 'Q' } },
      answer,
    ).report.status,
  ).toBe('needs_review');
  const disabled = evaluateDerivationAnswer(
    { ...authoritative, content: { ...authoritative.content, rules: [] } },
    answer,
  );
  expect(disabled.report.status).toBe('needs_review');
  expect(
    disabled.report.diagnostics.some((diagnostic) => diagnostic.code === 'RULE_DISABLED'),
  ).toBe(true);
  expect(() => evaluateDerivationAnswer({ ...authoritative, content: definition }, answer)).toThrow(
    DerivationAuthoringError,
  );
  expect(() =>
    evaluateDerivationAnswer(
      {
        ...authoritative,
        content: { ...authoritative.content, rules: [{ id: 'custom_rule', label: 'Custom' }] },
      },
      answer,
    ),
  ).toThrow(DerivationAuthoringError);
});

test('unused erroneous work requires review even when the final target is independently established', () => {
  const { authoritative, answer } = fixture();
  const extra = {
    kind: 'inference' as const,
    id: randomUUID(),
    blockId: null,
    formula: 'Q',
    ruleId: null,
    lineReferences: [],
    subproofReferences: [],
  };
  answer.proof.steps.splice(1, 0, extra);
  const evidence = evaluateDerivationAnswer(authoritative, answer);
  expect(evidence.report.status).toBe('needs_review');
  expect(evidence.report.target).toBe('established');
});

test('locally valid downstream work keeps invalid upstream support distinct', () => {
  const { authoritative } = fixture();
  const premiseA = randomUUID(),
    premiseB = randomUUID();
  const first = randomUUID(),
    second = randomUUID(),
    wrong = randomUUID(),
    last = randomUUID();
  const content = {
    ...authoritative.content,
    premises: [
      { id: premiseA, formula: 'P' },
      { id: premiseB, formula: 'P -> Q' },
    ],
    conclusion: 'Q',
    rules: [
      { id: 'and_introduction', label: 'And intro' },
      { id: 'reiteration', label: 'Repeat' },
    ],
  };
  const answer = {
    type: 'derivation',
    proof: {
      proofVersion: 1,
      format: 'fitch',
      blocks: [],
      steps: [
        { kind: 'premise', id: first, blockId: null, formula: 'P', premiseId: premiseA },
        { kind: 'premise', id: second, blockId: null, formula: 'P -> Q', premiseId: premiseB },
        {
          kind: 'inference',
          id: wrong,
          blockId: null,
          formula: 'Q',
          ruleId: 'and_introduction',
          lineReferences: [first, second],
          subproofReferences: [],
        },
        {
          kind: 'inference',
          id: last,
          blockId: null,
          formula: 'Q',
          ruleId: 'reiteration',
          lineReferences: [wrong],
          subproofReferences: [],
        },
      ],
    },
  };
  const report = evaluateDerivationAnswer({ ...authoritative, content }, answer).report;
  expect(report.status).toBe('needs_review');
  expect(report.steps[3]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'invalid' });
});

test('unassessable evidence is explicit and cannot become a guessed numeric result', () => {
  const { authoritative, answer } = fixture();
  const evidence = evaluateDerivationAnswer(
    { ...authoritative, content: { ...authoritative.content, conclusion: '' } },
    answer,
  );
  expect(evidence.report.status).toBe('unassessable');
  expect(evidence.report.diagnostics.length).toBeGreaterThan(0);
  expect(evidence).not.toHaveProperty('score');
  expect(() =>
    derivationEvaluationEvidenceSchema.parse({ ...evidence, earnedPoints: 0 }),
  ).toThrow();
});

test('staged proof work/evidence does not broaden live assignment, save or result admission', () => {
  const { authoritative, answer, definition } = fixture();
  expect(derivationAnswerSchema.safeParse(answer).success).toBe(true);
  expect(assignmentResponseValueSchema.safeParse(answer).success).toBe(false);
  expect(
    saveStudentAnswersSchema.safeParse({
      revision: 0,
      itemId: authoritative.itemId,
      answers: answer,
    }).success,
  ).toBe(false);
  expect(
    submissionResultSchema.safeParse(evaluateDerivationAnswer(authoritative, answer)).success,
  ).toBe(false);
  expect(() => supportedProblemDefinition(definition)).toThrow();
});
