import type {
  TreeProof,
  TreeProofNode,
  TreeProofBranch,
  TreeDerivationDefinition as StoredDefinition,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import type {
  TreeProof as TransportedProof,
  TreeProofNode as TransportedNode,
  TreeProofBranch as TransportedBranch,
} from '@logiclab/contracts';
import {
  treeDerivationContentSchema,
  treeDerivationDefinitionSchema,
  treeDerivationSolutionSchema,
  type TreeDerivationDefinition,
} from '@logiclab/contracts/tree-derivation';
import { fitchDerivationDefinitionSchema } from '@logiclab/contracts/derivation';
import { dependencyDerivationDefinitionSchema } from '@logiclab/contracts/dependency-derivation';
import {
  libraryProblemDefinitionSchema,
  createLibraryProblemRequestSchema,
} from '@logiclab/contracts/problem-library';
import { savedDerivationAnswerSchema } from '@logiclab/contracts/saved-student-work';
import {
  treeDefinitionFixture,
  derivationDefinitionFixture,
  dependencyDefinitionFixture,
} from '../../../../../test/derivation-fixture';
import {
  validateTreeContent,
  validateTreeDefinition,
  checkTreeReference,
  treePublicationDefinition,
  treeContent,
  treeReferenceSolution,
} from './authoring';
import { DerivationAuthoringError, DerivationPublicationError } from '../errors';
import { libraryProblemDefinition, publicationDefinition } from '../../library-definition';
import { supportedAssignmentDefinition } from '../../../assignment/definition-support';
import { AssignmentOperationError } from '../../../assignment/errors';
import { publicDerivationContent, derivationReferenceSolution } from '../projections';

type Assert<T extends true> = T;
type DefinitionTypesMatch = Assert<
  StoredDefinition extends TreeDerivationDefinition
    ? TreeDerivationDefinition extends StoredDefinition
      ? true
      : false
    : false
>;
type ProofTypesMatch = Assert<
  TreeProof extends TransportedProof ? (TransportedProof extends TreeProof ? true : false) : false
>;
type NodeTypesMatch = Assert<
  TreeProofNode extends TransportedNode
    ? TransportedNode extends TreeProofNode
      ? true
      : false
    : false
>;
type BranchTypesMatch = Assert<
  TreeProofBranch extends TransportedBranch
    ? TransportedBranch extends TreeProofBranch
      ? true
      : false
    : false
>;
const a = 'a1111111-1111-4111-8111-111111111111';

test('exact database/transport tree types round-trip with a checked private reference', () => {
  const stored: StoredDefinition = treeDerivationDefinitionSchema.parse(treeDefinitionFixture());
  const transported: TreeDerivationDefinition = stored;
  expect(treeDerivationDefinitionSchema.parse(JSON.parse(JSON.stringify(transported)))).toEqual(
    treeDefinitionFixture(),
  );
  expect(checkTreeReference(transported)).toMatchObject({
    status: 'checked',
    report: { status: 'accepted' },
  });
});

test('blank statements, missing references and disconnected edits remain draft work', () => {
  const value: TreeDerivationDefinition = {
    ...treeDefinitionFixture(),
    premises: [{ id: a, formula: '' }],
    conclusion: '',
    rules: [],
    referenceProof: null,
    explanation: null,
  };
  expect(validateTreeDefinition(value)).toEqual(value);
  expect(checkTreeReference(value)).toEqual({ status: 'missing' });
  expect(() => treePublicationDefinition(value)).toThrow(DerivationPublicationError);
  const partial = treeDefinitionFixture();
  const proof = partial.referenceProof!;
  proof.rootId = null;
  proof.nodes[0]!.formula = 'P &';
  const inference = proof.nodes[1]!;
  if (inference.kind !== 'inference') throw Error('Expected inference fixture');
  inference.ruleId = null;
  inference.branches[0]!.rootId = null;
  expect(validateTreeDefinition(partial)).toEqual(partial);
  expect(checkTreeReference(partial)).toMatchObject({
    status: 'checked',
    report: { status: 'needs_review' },
  });
});

test('publication rechecks the exact statement, permissions and proof without changing inputs', () => {
  const value = treeDefinitionFixture();
  value.rules[0]!.label = 'My conditional proof';
  value.conclusion = 'P → P';
  const before = structuredClone(value);
  expect(treePublicationDefinition(value)).toEqual(value);
  expect(value).toEqual(before);
  for (const changed of [
    { ...value, conclusion: 'Q' },
    { ...value, rules: [] },
    { ...value, referenceProof: null },
  ]) {
    expect(() => treePublicationDefinition(changed)).toThrow(DerivationPublicationError);
    expect(() => treeReferenceSolution(changed)).toThrow(DerivationAuthoringError);
  }
});

test('a tree with locally matching rules but open assumptions cannot be certified', () => {
  const value = treeDefinitionFixture();
  const root = value.referenceProof!.nodes[1]!;
  if (root.kind !== 'inference') throw Error('Expected inference fixture');
  root.branches[0]!.assumptionIds = [];
  expect(checkTreeReference(value)).toMatchObject({
    status: 'checked',
    report: { status: 'needs_review', target: 'not_established' },
  });
  expect(() => treePublicationDefinition(value)).toThrow(DerivationPublicationError);
  expect(() => treeReferenceSolution(value)).toThrow(DerivationAuthoringError);
});

test('resource/configuration failure cannot certify or reveal a reference', () => {
  const value = { ...treeDefinitionFixture(), conclusion: '!'.repeat(33) + 'P' };
  expect(checkTreeReference(value)).toMatchObject({
    status: 'checked',
    report: { status: 'unassessable' },
  });
  expect(() => treePublicationDefinition(value)).toThrow(DerivationPublicationError);
  expect(() => treeReferenceSolution(value)).toThrow(DerivationAuthoringError);
});

test('ordinary content excludes both private reference and instructor explanation', () => {
  const value = treeDefinitionFixture();
  const before = structuredClone(value);
  const content = treeContent(value);
  expect(content.format).toBe('tree');
  expect(content).not.toHaveProperty('referenceProof');
  expect(content).not.toHaveProperty('explanation');
  expect(validateTreeContent(content)).toEqual(content);
  expect(() => validateTreeContent({ ...content, referenceProof: value.referenceProof })).toThrow(
    DerivationAuthoringError,
  );
  expect(
    treeDerivationContentSchema.safeParse({ ...content, explanation: value.explanation }).success,
  ).toBe(false);
  expect(value).toEqual(before);
});

test('solution projection requires acceptance and returns the exact tree with a normalized explanation', () => {
  const value = treeDefinitionFixture();
  const solution = treeReferenceSolution(value);
  expect(treeDerivationSolutionSchema.parse(solution)).toEqual(solution);
  expect(solution.referenceProof).toEqual(value.referenceProof);
  expect(solution.explanation).toBe(value.explanation);
  const noExplanation = { ...value, explanation: undefined };
  expect(treeReferenceSolution(noExplanation).explanation).toBeNull();
  expect(() => treeReferenceSolution({ ...value, referenceProof: null })).toThrow(
    DerivationAuthoringError,
  );
});

test.each([
  { format: 'fitch' },
  { format: 'dependency' },
  { definitionVersion: 2 },
  { checkerVersion: 2 },
  { ruleCatalogVersion: 2 },
  { accepted: true },
  { report: { status: 'accepted' } },
  { ownerId: a },
  { referenceProof: derivationDefinitionFixture().referenceProof },
  { referenceProof: dependencyDefinitionFixture().referenceProof },
  { referenceProof: { ...treeDefinitionFixture().referenceProof, format: 'fitch' } },
  {
    rules: [
      { id: 'implication_introduction', label: 'CP' },
      { id: 'implication_introduction', label: 'Other' },
    ],
  },
  {
    rules: [
      { id: 'implication_introduction', label: 'ＣＰ' },
      { id: 'reiteration', label: ' cp ' },
    ],
  },
  { rules: [{ id: 'implication_introduction', label: 'CP\u200b' }] },
  {
    premises: [
      { id: a, formula: 'P' },
      { id: a.toUpperCase(), formula: 'Q' },
    ],
  },
  { explanation: 'x'.repeat(5001) },
])('rejects mismatched formats, cached acceptance and ambiguous configuration %#', (change) => {
  expect(() => validateTreeDefinition({ ...treeDefinitionFixture(), ...change })).toThrow(
    DerivationAuthoringError,
  );
});

test('unknown/custom rules cannot be enabled by familiar display terminology', () => {
  expect(() =>
    validateTreeDefinition({
      ...treeDefinitionFixture(),
      rules: [{ id: 'custom_rule', label: 'Modus ponens' }],
    }),
  ).toThrow(DerivationAuthoringError);
  expect(
    treeDerivationDefinitionSchema.safeParse({
      ...treeDefinitionFixture(),
      rules: [{ id: 'implication_introduction', label: 'CP', behavior: 'anything' }],
    }).success,
  ).toBe(false);
  const value = treeDefinitionFixture();
  value.rules[0]!.label = '  Conditional proof  ';
  value.explanation = '  Private explanation  ';
  expect(validateTreeDefinition(value).rules[0]!.label).toBe('Conditional proof');
  expect(validateTreeDefinition(value).explanation).toBe('Private explanation');
});

test('format-specific certification cannot reuse an accepted Fitch or dependency reference', () => {
  for (const value of [derivationDefinitionFixture(), dependencyDefinitionFixture()]) {
    expect(() => checkTreeReference(value)).toThrow(DerivationAuthoringError);
    expect(() => checkTreeReference({ ...value, format: 'tree' })).toThrow(
      DerivationAuthoringError,
    );
  }
  expect(fitchDerivationDefinitionSchema.safeParse(treeDefinitionFixture()).success).toBe(false);
  expect(dependencyDerivationDefinitionSchema.safeParse(treeDefinitionFixture()).success).toBe(
    false,
  );
});

test('tree admission supports each assessment mode while retaining proof feedback-policy checks', () => {
  const value = treePublicationDefinition(treeDefinitionFixture());
  expect(libraryProblemDefinitionSchema.safeParse(value).success).toBe(true);
  expect(
    createLibraryProblemRequestSchema.safeParse({ title: 'Not yet admitted', definition: value })
      .success,
  ).toBe(true);
  expect(libraryProblemDefinition(value)).toEqual(value);
  expect(publicationDefinition(value)).toEqual(value);
  expect(publicDerivationContent(value)).toEqual(treeContent(value));
  expect(derivationReferenceSolution(value)).toEqual(treeReferenceSolution(value));
  expect(
    savedDerivationAnswerSchema.safeParse({ type: 'derivation', proof: value.referenceProof })
      .success,
  ).toBe(true);
  for (const assessmentMode of ['graded', 'completion_only', 'ungraded_practice']) {
    expect(
      supportedAssignmentDefinition(value, {
        assessmentMode,
        feedbackTiming: assessmentMode === 'ungraded_practice' ? 'on_check' : 'on_submission',
      }),
    ).toEqual(value);
  }
  expect(() =>
    supportedAssignmentDefinition(value, {
      assessmentMode: 'completion_only',
      feedbackTiming: 'on_check',
    }),
  ).toThrow(AssignmentOperationError);
  expect(() =>
    supportedAssignmentDefinition(value, { assessmentMode: 'graded', feedbackTiming: 'on_check' }),
  ).toThrow(AssignmentOperationError);
});
