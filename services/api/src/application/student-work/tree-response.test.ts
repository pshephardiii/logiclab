import { randomUUID } from 'node:crypto';
import {
  treeDerivationAnswerSchema,
  saveTreeAnswersSchema,
  checkTreeAnswersSchema,
  type TreeDerivationAnswer,
} from '@logiclab/contracts/tree-derivation-work';
import type { TreeDerivationAnswer as StoredAnswer } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import { PROOF_LIMITS } from '@logiclab/contracts';
import { derivationEvaluationEvidenceSchema } from '@logiclab/contracts/derivation-work';
import {
  savedStudentAnswersSchema,
  savedStudentCheckSchema,
  savedStudentResponsesSchema,
} from '@logiclab/contracts/saved-student-work';
import {
  treeDefinitionFixture,
  derivationDefinitionFixture,
  dependencyDefinitionFixture,
} from '../../../test/derivation-fixture';
import { treeContent } from '../problem/derivation/tree/authoring';
import { evaluateTreeAnswer, validateTreeAnswer } from './tree-response';
import { validateDerivationAnswer } from './derivation-response';
import { validateDependencyAnswer } from './dependency-response';
import { StudentWorkError } from './errors';
import { evaluateProofSubmission } from './proof-submission';
import { evaluateProofCompletion } from './proof-completion';

type Assert<T extends true> = T;
type AnswerTypesMatch = Assert<
  StoredAnswer extends TreeDerivationAnswer
    ? TreeDerivationAnswer extends StoredAnswer
      ? true
      : false
    : false
>;
function fixture() {
  const definition = treeDefinitionFixture();
  const answer: TreeDerivationAnswer = { type: 'derivation', proof: definition.referenceProof! };
  const authoritative = {
    itemId: randomUUID(),
    problemVersionId: randomUUID(),
    content: treeContent(definition),
  };
  return { definition, answer, authoritative };
}

test('tree finalization uses the shared retained evidence formats for graded and completion work', () => {
  const { definition, authoritative, answer } = fixture();
  const items = [
    { id: authoritative.itemId, problemVersionId: authoritative.problemVersionId, definition },
  ];
  expect(evaluateProofSubmission(items, { [authoritative.itemId]: answer })).toMatchObject({
    gradingVersion: 'proof_mixed_v1',
    summary: { proofs: { accepted: 1 } },
  });
  expect(evaluateProofCompletion(items, { [authoritative.itemId]: answer })).toMatchObject({
    gradingVersion: 'proof_completion_v1',
    summary: { proofVerification: { verified: 1 } },
  });
});

test('exact student JSON and staged requests round-trip without borrowing the reference object', () => {
  const { answer, authoritative } = fixture();
  const stored: StoredAnswer = treeDerivationAnswerSchema.parse(JSON.parse(JSON.stringify(answer)));
  expect(stored).toEqual(answer);
  expect(
    saveTreeAnswersSchema.parse({ revision: 0, itemId: authoritative.itemId, answers: stored })
      .answers,
  ).toEqual(answer);
  expect(
    checkTreeAnswersSchema.parse({ itemId: authoritative.itemId, answers: stored }).answers,
  ).toEqual(answer);
  const parsed = validateTreeAnswer(answer);
  parsed.proof.nodes[0]!.formula = 'Q';
  expect(answer.proof.nodes[0]!.formula).toBe('P');
});

test('validation retains incomplete and erroneous fields without checking or rewriting the tree', () => {
  const { answer } = fixture();
  answer.proof.rootId = null;
  answer.proof.nodes[0]!.formula = 'P &';
  const node = answer.proof.nodes[1]!;
  if (node.kind !== 'inference') throw Error();
  node.ruleId = null;
  node.lineReferences = [randomUUID()];
  node.branches = [{ rootId: null, assumptionFormula: '', assumptionIds: [randomUUID()] }];
  const before = structuredClone(answer);
  expect(validateTreeAnswer(answer)).toEqual(before);
  expect(answer).toEqual(before);
  expect(
    validateTreeAnswer({
      type: 'derivation',
      proof: { proofVersion: 1, format: 'tree', rootId: null, nodes: [] },
    }).proof.nodes,
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
])('rejects student replacement/injected %s fields', (field) => {
  const { answer } = fixture();
  expect(() => validateTreeAnswer({ ...answer, [field]: 'forged' })).toThrow(StudentWorkError);
  expect(() =>
    validateTreeAnswer({ ...answer, proof: { ...answer.proof, [field]: 'forged' } }),
  ).toThrow(StudentWorkError);
});

test.each([
  'nodes',
  'formula',
  'children',
  'branches',
  'assumptions',
  'version',
  'format',
  'identity',
] as const)('rejects malformed or excessive %s transport', (kind) => {
  const { answer } = fixture();
  const proof = JSON.parse(JSON.stringify(answer.proof));
  if (kind === 'nodes') proof.nodes = Array(PROOF_LIMITS.maxSteps + 1).fill(proof.nodes[0]);
  if (kind === 'formula') proof.nodes[0].formula = 'P'.repeat(PROOF_LIMITS.maxFormulaLength + 1);
  if (kind === 'children')
    proof.nodes[1].lineReferences = [randomUUID(), randomUUID(), randomUUID()];
  if (kind === 'branches') proof.nodes[1].branches = Array(3).fill(proof.nodes[1].branches[0]);
  if (kind === 'assumptions')
    proof.nodes[1].branches[0].assumptionIds = Array(PROOF_LIMITS.maxSteps + 1).fill(randomUUID());
  if (kind === 'version') proof.proofVersion = 2;
  if (kind === 'format') proof.format = 'fitch';
  if (kind === 'identity') proof.rootId = 'bad';
  expect(() => validateTreeAnswer({ ...answer, proof })).toThrow(StudentWorkError);
});

test.each([-1, 0.5, 2147483647, '0', null])('rejects invalid save revision %s', (revision) => {
  const { answer, authoritative } = fixture();
  expect(
    saveTreeAnswersSchema.safeParse({ revision, itemId: authoritative.itemId, answers: answer })
      .success,
  ).toBe(false);
});

test('requests require valid occurrence metadata and never accept a replacement problem', () => {
  const { answer, authoritative } = fixture();
  expect(checkTreeAnswersSchema.safeParse({ answers: answer }).success).toBe(false);
  expect(checkTreeAnswersSchema.safeParse({ itemId: 'bad', answers: answer }).success).toBe(false);
  expect(
    checkTreeAnswersSchema.safeParse({
      itemId: authoritative.itemId,
      answers: answer,
      problem: authoritative.content,
    }).success,
  ).toBe(false);
  expect(
    saveTreeAnswersSchema.safeParse({
      revision: 0,
      itemId: authoritative.itemId,
      answers: answer,
      accepted: true,
    }).success,
  ).toBe(false);
});

test('evaluation binds evidence to authoritative occurrences without a reference, explanation or numerical award', () => {
  const { answer, authoritative } = fixture();
  const before = structuredClone({ answer, authoritative });
  const evidence = evaluateTreeAnswer(authoritative, answer);
  expect(evidence).toMatchObject({
    itemId: authoritative.itemId,
    problemVersionId: authoritative.problemVersionId,
    report: { status: 'accepted', target: 'established' },
  });
  expect(derivationEvaluationEvidenceSchema.parse(evidence)).toEqual(evidence);
  expect(Object.keys(evidence).sort()).toEqual([
    'evaluationVersion',
    'itemId',
    'problemVersionId',
    'report',
    'type',
  ]);
  expect(JSON.stringify(evidence)).not.toContain('Assuming P permits');
  expect({ answer, authoritative }).toEqual(before);
  expect(
    evaluateTreeAnswer(
      { ...authoritative, content: { ...authoritative.content, conclusion: 'Q' } },
      answer,
    ).report.status,
  ).toBe('needs_review');
  expect(
    evaluateTreeAnswer(
      { ...authoritative, content: { ...authoritative.content, rules: [] } },
      answer,
    ).report.status,
  ).toBe('needs_review');
  const second = { ...authoritative, itemId: randomUUID() };
  expect(evaluateTreeAnswer(second, answer).itemId).toBe(second.itemId);
});

test('incorrect/incomplete work needs review; invalid authoritative configuration is unassessable', () => {
  const { authoritative, answer } = fixture();
  answer.proof.nodes[0]!.formula = 'Q';
  expect(evaluateTreeAnswer(authoritative, answer).report.status).toBe('needs_review');
  expect(
    evaluateTreeAnswer(authoritative, {
      ...answer,
      proof: { ...answer.proof, rootId: null, nodes: [] },
    }).report.status,
  ).toBe('needs_review');
  expect(
    evaluateTreeAnswer(
      { ...authoritative, content: { ...authoritative.content, conclusion: 'P &' } },
      answer,
    ).report.status,
  ).toBe('unassessable');
});

test('a plausible-looking premise leaf cannot replace the pinned premise formula', () => {
  const { authoritative, answer } = fixture();
  const premiseId = randomUUID(),
    id = randomUUID();
  const content = {
    ...authoritative.content,
    premises: [{ id: premiseId, formula: 'P' }],
    conclusion: 'Q',
  };
  const forged = {
    type: 'derivation',
    proof: {
      ...answer.proof,
      rootId: id,
      nodes: [{ kind: 'premise', id, premiseId, formula: 'Q' }],
    },
  };
  expect(evaluateTreeAnswer({ ...authoritative, content }, forged).report.status).toBe(
    'needs_review',
  );
});

test('tree validation stays format-specific while saved-work transport admits tree drafts', () => {
  const { answer, authoritative } = fixture();
  for (const definition of [derivationDefinitionFixture(), dependencyDefinitionFixture()])
    expect(() =>
      validateTreeAnswer({ type: 'derivation', proof: definition.referenceProof }),
    ).toThrow(StudentWorkError);
  expect(() => validateDerivationAnswer(answer)).toThrow(StudentWorkError);
  expect(() => validateDependencyAnswer(answer)).toThrow(StudentWorkError);
  expect(savedStudentResponsesSchema.safeParse({ [authoritative.itemId]: answer }).success).toBe(
    true,
  );
  expect(
    savedStudentAnswersSchema.safeParse({
      revision: 0,
      itemId: authoritative.itemId,
      answers: answer,
    }).success,
  ).toBe(true);
  expect(
    savedStudentCheckSchema.safeParse({ itemId: authoritative.itemId, answers: answer }).success,
  ).toBe(true);
});

test('authoritative public content rejects private reference data and unsupported configuration', () => {
  const { definition, authoritative, answer } = fixture();
  for (const content of [
    definition,
    { ...authoritative.content, checkerVersion: 2 },
    { ...authoritative.content, rules: [{ id: 'custom_rule', label: 'MP' }] },
    { ...authoritative.content, format: 'fitch' },
  ]) {
    expect(() =>
      evaluateTreeAnswer(
        { ...authoritative, content: content as typeof authoritative.content },
        answer,
      ),
    ).toThrow();
  }
});
