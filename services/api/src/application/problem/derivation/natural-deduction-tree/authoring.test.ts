import { ProofMethodUnavailableError } from '../../../proof/availability';
import type {
  NaturalDeductionTreeProof,
  NaturalDeductionTreeProofNode,
  NaturalDeductionTreeProofBranch,
  NaturalDeductionTreeDerivationDefinition as StoredDefinition,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import type {
  NaturalDeductionTreeProof as TransportedProof,
  NaturalDeductionTreeProofNode as TransportedNode,
  NaturalDeductionTreeProofBranch as TransportedBranch,
} from '@logiclab/contracts';
import {
  naturalDeductionTreeDerivationContentSchema,
  naturalDeductionTreeDerivationDefinitionSchema,
  naturalDeductionTreeDerivationSolutionSchema,
  type NaturalDeductionTreeDerivationDefinition,
} from '@logiclab/contracts/natural-deduction-tree-derivation';
import { fitchDerivationDefinitionSchema } from '@logiclab/contracts/derivation';
import { dependencyDerivationDefinitionSchema } from '@logiclab/contracts/dependency-derivation';
import {
  libraryProblemDefinitionSchema,
  createLibraryProblemRequestSchema,
} from '@logiclab/contracts/problem-library';
import { savedDerivationAnswerSchema } from '@logiclab/contracts/saved-student-work';
import {
  naturalDeductionTreeDefinitionFixture,
  derivationDefinitionFixture,
  dependencyDefinitionFixture,
} from '../../../../../test/derivation-fixture';
import {
  validateNaturalDeductionTreeContent,
  validateNaturalDeductionTreeDefinition,
  checkNaturalDeductionTreeReference,
  naturalDeductionTreePublicationDefinition,
  naturalDeductionTreeContent,
  naturalDeductionTreeReferenceSolution,
} from './authoring';
import { DerivationAuthoringError, DerivationPublicationError } from '../errors';
import { libraryProblemDefinition, publicationDefinition } from '../../library-definition';
import { supportedAssignmentDefinition } from '../../../assignment/definition-support';
import { AssignmentOperationError } from '../../../assignment/errors';
import { publicDerivationContent, derivationReferenceSolution } from '../projections';

type Assert<T extends true> = T;
type DefinitionTypesMatch = Assert<
  StoredDefinition extends NaturalDeductionTreeDerivationDefinition
    ? NaturalDeductionTreeDerivationDefinition extends StoredDefinition
      ? true
      : false
    : false
>;
type ProofTypesMatch = Assert<
  NaturalDeductionTreeProof extends TransportedProof
    ? TransportedProof extends NaturalDeductionTreeProof
      ? true
      : false
    : false
>;
type NodeTypesMatch = Assert<
  NaturalDeductionTreeProofNode extends TransportedNode
    ? TransportedNode extends NaturalDeductionTreeProofNode
      ? true
      : false
    : false
>;
type BranchTypesMatch = Assert<
  NaturalDeductionTreeProofBranch extends TransportedBranch
    ? TransportedBranch extends NaturalDeductionTreeProofBranch
      ? true
      : false
    : false
>;
const a = 'a1111111-1111-4111-8111-111111111111';

test('exact database/transport tree types round-trip with a checked private reference', () => {
  const stored: StoredDefinition = naturalDeductionTreeDerivationDefinitionSchema.parse(
    naturalDeductionTreeDefinitionFixture(),
  );
  const transported: NaturalDeductionTreeDerivationDefinition = stored;
  expect(
    naturalDeductionTreeDerivationDefinitionSchema.parse(JSON.parse(JSON.stringify(transported))),
  ).toEqual(naturalDeductionTreeDefinitionFixture());
  expect(checkNaturalDeductionTreeReference(transported)).toMatchObject({
    status: 'checked',
    report: { status: 'accepted' },
  });
});

test('blank statements, missing references and disconnected edits remain draft work', () => {
  const value: NaturalDeductionTreeDerivationDefinition = {
    ...naturalDeductionTreeDefinitionFixture(),
    premises: [{ id: a, formula: '' }],
    conclusion: '',
    rules: [],
    referenceProof: null,
    explanation: null,
  };
  expect(validateNaturalDeductionTreeDefinition(value)).toEqual(value);
  expect(checkNaturalDeductionTreeReference(value)).toEqual({ status: 'missing' });
  expect(() => naturalDeductionTreePublicationDefinition(value)).toThrow(
    DerivationPublicationError,
  );
  const partial = naturalDeductionTreeDefinitionFixture();
  const proof = partial.referenceProof!;
  proof.rootId = null;
  proof.nodes[0]!.formula = 'P &';
  const inference = proof.nodes[1]!;
  if (inference.kind !== 'inference') throw Error('Expected inference fixture');
  inference.ruleId = null;
  inference.branches[0]!.rootId = null;
  expect(validateNaturalDeductionTreeDefinition(partial)).toEqual(partial);
  expect(checkNaturalDeductionTreeReference(partial)).toMatchObject({
    status: 'checked',
    report: { status: 'needs_review' },
  });
});

test('publication rechecks the exact statement, permissions and proof without changing inputs', () => {
  const value = naturalDeductionTreeDefinitionFixture();
  value.rules[0]!.label = 'My conditional proof';
  value.conclusion = 'P → P';
  const before = structuredClone(value);
  expect(naturalDeductionTreePublicationDefinition(value)).toEqual(value);
  expect(value).toEqual(before);
  for (const changed of [
    { ...value, conclusion: 'Q' },
    { ...value, rules: [] },
    { ...value, referenceProof: null },
  ]) {
    expect(() => naturalDeductionTreePublicationDefinition(changed)).toThrow(
      DerivationPublicationError,
    );
    expect(() => naturalDeductionTreeReferenceSolution(changed)).toThrow(DerivationAuthoringError);
  }
});

test('a tree with locally matching rules but open assumptions cannot be certified', () => {
  const value = naturalDeductionTreeDefinitionFixture();
  const root = value.referenceProof!.nodes[1]!;
  if (root.kind !== 'inference') throw Error('Expected inference fixture');
  root.branches[0]!.assumptionIds = [];
  expect(checkNaturalDeductionTreeReference(value)).toMatchObject({
    status: 'checked',
    report: { status: 'needs_review', target: 'not_established' },
  });
  expect(() => naturalDeductionTreePublicationDefinition(value)).toThrow(
    DerivationPublicationError,
  );
  expect(() => naturalDeductionTreeReferenceSolution(value)).toThrow(DerivationAuthoringError);
});

test('resource/configuration failure cannot certify or reveal a reference', () => {
  const value = { ...naturalDeductionTreeDefinitionFixture(), conclusion: '!'.repeat(33) + 'P' };
  expect(checkNaturalDeductionTreeReference(value)).toMatchObject({
    status: 'checked',
    report: { status: 'unassessable' },
  });
  expect(() => naturalDeductionTreePublicationDefinition(value)).toThrow(
    DerivationPublicationError,
  );
  expect(() => naturalDeductionTreeReferenceSolution(value)).toThrow(DerivationAuthoringError);
});

test('ordinary content excludes both private reference and instructor explanation', () => {
  const value = naturalDeductionTreeDefinitionFixture();
  const before = structuredClone(value);
  const content = naturalDeductionTreeContent(value);
  expect(content.format).toBe('tree');
  expect(content).not.toHaveProperty('referenceProof');
  expect(content).not.toHaveProperty('explanation');
  expect(validateNaturalDeductionTreeContent(content)).toEqual(content);
  expect(() =>
    validateNaturalDeductionTreeContent({ ...content, referenceProof: value.referenceProof }),
  ).toThrow(DerivationAuthoringError);
  expect(
    naturalDeductionTreeDerivationContentSchema.safeParse({
      ...content,
      explanation: value.explanation,
    }).success,
  ).toBe(false);
  expect(value).toEqual(before);
});

test('solution projection requires acceptance and returns the exact tree with a normalized explanation', () => {
  const value = naturalDeductionTreeDefinitionFixture();
  const solution = naturalDeductionTreeReferenceSolution(value);
  expect(naturalDeductionTreeDerivationSolutionSchema.parse(solution)).toEqual(solution);
  expect(solution.referenceProof).toEqual(value.referenceProof);
  expect(solution.explanation).toBe(value.explanation);
  const noExplanation = { ...value, explanation: undefined };
  expect(naturalDeductionTreeReferenceSolution(noExplanation).explanation).toBeNull();
  expect(() => naturalDeductionTreeReferenceSolution({ ...value, referenceProof: null })).toThrow(
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
  {
    referenceProof: { ...naturalDeductionTreeDefinitionFixture().referenceProof, format: 'fitch' },
  },
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
  expect(() =>
    validateNaturalDeductionTreeDefinition({
      ...naturalDeductionTreeDefinitionFixture(),
      ...change,
    }),
  ).toThrow(DerivationAuthoringError);
});

test('unknown/custom rules cannot be enabled by familiar display terminology', () => {
  expect(() =>
    validateNaturalDeductionTreeDefinition({
      ...naturalDeductionTreeDefinitionFixture(),
      rules: [{ id: 'custom_rule', label: 'Modus ponens' }],
    }),
  ).toThrow(DerivationAuthoringError);
  expect(
    naturalDeductionTreeDerivationDefinitionSchema.safeParse({
      ...naturalDeductionTreeDefinitionFixture(),
      rules: [{ id: 'implication_introduction', label: 'CP', behavior: 'anything' }],
    }).success,
  ).toBe(false);
  const value = naturalDeductionTreeDefinitionFixture();
  value.rules[0]!.label = '  Conditional proof  ';
  value.explanation = '  Private explanation  ';
  expect(validateNaturalDeductionTreeDefinition(value).rules[0]!.label).toBe('Conditional proof');
  expect(validateNaturalDeductionTreeDefinition(value).explanation).toBe('Private explanation');
});

test('format-specific certification cannot reuse an accepted Fitch or dependency reference', () => {
  for (const value of [derivationDefinitionFixture(), dependencyDefinitionFixture()]) {
    expect(() => checkNaturalDeductionTreeReference(value)).toThrow(DerivationAuthoringError);
    expect(() => checkNaturalDeductionTreeReference({ ...value, format: 'tree' })).toThrow(
      DerivationAuthoringError,
    );
  }
  expect(
    fitchDerivationDefinitionSchema.safeParse(naturalDeductionTreeDefinitionFixture()).success,
  ).toBe(false);
  expect(
    dependencyDerivationDefinitionSchema.safeParse(naturalDeductionTreeDefinitionFixture()).success,
  ).toBe(false);
});

test('historical tree projection supports each assessment mode while new publication is unavailable', () => {
  const value = naturalDeductionTreePublicationDefinition(naturalDeductionTreeDefinitionFixture());
  expect(libraryProblemDefinitionSchema.safeParse(value).success).toBe(true);
  expect(
    createLibraryProblemRequestSchema.safeParse({ title: 'Not yet admitted', definition: value })
      .success,
  ).toBe(true);
  expect(libraryProblemDefinition(value)).toEqual(value);
  expect(() => publicationDefinition(value)).toThrow(ProofMethodUnavailableError);
  expect(publicDerivationContent(value)).toEqual(naturalDeductionTreeContent(value));
  expect(derivationReferenceSolution(value)).toEqual(naturalDeductionTreeReferenceSolution(value));
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
