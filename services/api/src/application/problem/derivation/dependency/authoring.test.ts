import type {
  DependencyProof,
  DependencyProofStep,
  DependencyDerivationDefinition as StoredDefinition,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import type {
  DependencyProof as TransportedProof,
  DependencyProofStep as TransportedStep,
} from '@logiclab/contracts';
import {
  dependencyDerivationContentSchema,
  dependencyDerivationDefinitionSchema,
  dependencyDerivationSolutionSchema,
  type DependencyDerivationDefinition,
} from '@logiclab/contracts/dependency-derivation';
import { fitchDerivationDefinitionSchema } from '@logiclab/contracts/derivation';
import {
  createLibraryProblemRequestSchema,
  libraryProblemDefinitionSchema,
} from '@logiclab/contracts/problem-library';
import { fitchDerivationAnswerSchema } from '@logiclab/contracts/derivation-work';
import { derivationDefinitionFixture } from '../../../../../test/derivation-fixture';
import {
  validateDependencyContent,
  validateDependencyDefinition,
  checkDependencyReference,
  dependencyPublicationDefinition,
  dependencyContent,
  dependencyReferenceSolution,
} from './authoring';
import { DerivationAuthoringError, DerivationPublicationError } from '../errors';
import { libraryProblemDefinition } from '../../library-definition';
import { supportedAssignmentDefinition } from '../../../assignment/definition-support';

type Assert<T extends true> = T;
type DefinitionTypesMatch = Assert<
  StoredDefinition extends DependencyDerivationDefinition
    ? DependencyDerivationDefinition extends StoredDefinition
      ? true
      : false
    : false
>;
type WorkTypesMatch = Assert<
  DependencyProof extends TransportedProof
    ? TransportedProof extends DependencyProof
      ? true
      : false
    : false
>;
type StepTypesMatch = Assert<
  DependencyProofStep extends TransportedStep
    ? TransportedStep extends DependencyProofStep
      ? true
      : false
    : false
>;
const a = 'a1111111-1111-4111-8111-111111111111',
  b = 'b2222222-2222-4222-8222-222222222222';
function definition(): DependencyDerivationDefinition {
  return {
    ...derivationDefinitionFixture(),
    format: 'dependency',
    referenceProof: {
      proofVersion: 1,
      format: 'dependency',
      steps: [
        { kind: 'assumption', id: a, formula: 'P', dependencies: [a] },
        {
          kind: 'inference',
          id: b,
          formula: 'P -> P',
          dependencies: [],
          ruleId: 'implication_introduction',
          lineReferences: [],
          discharges: [{ assumptionId: a, conclusionId: a }],
        },
      ],
    },
  };
}

test('private dependency JSON and exact database types round-trip as exact JSON', () => {
  const stored: StoredDefinition = dependencyDerivationDefinitionSchema.parse(definition());
  const transported: DependencyDerivationDefinition = stored;
  expect(
    dependencyDerivationDefinitionSchema.parse(JSON.parse(JSON.stringify(transported))),
  ).toEqual(definition());
  expect(checkDependencyReference(transported)).toMatchObject({
    status: 'checked',
    report: { status: 'accepted' },
  });
});
test('blank and unfinished statements/references stay drafts rather than certified publications', () => {
  const value: DependencyDerivationDefinition = {
    ...definition(),
    conclusion: '',
    referenceProof: null,
    rules: [],
    explanation: null,
  };
  expect(validateDependencyDefinition(value)).toEqual(value);
  expect(checkDependencyReference(value)).toEqual({ status: 'missing' });
  expect(() => dependencyPublicationDefinition(value)).toThrow(DerivationPublicationError);
  const partial = definition();
  partial.referenceProof!.steps[0]!.formula = 'P &';
  const step = partial.referenceProof!.steps[1];
  if (step?.kind !== 'inference') throw Error();
  step.ruleId = null;
  step.discharges[0]!.conclusionId = null;
  expect(validateDependencyDefinition(partial)).toEqual(partial);
  expect(checkDependencyReference(partial)).toMatchObject({
    status: 'checked',
    report: { status: 'needs_review' },
  });
});
test('publication checks the exact definition and rules, ignores display terminology, and preserves inputs', () => {
  const value = definition();
  value.rules[0]!.label = 'My conditional proof';
  value.conclusion = 'P → P';
  const before = structuredClone(value);
  expect(dependencyPublicationDefinition(value)).toEqual(value);
  expect(value).toEqual(before);
  const changed = { ...value, conclusion: 'Q' };
  expect(checkDependencyReference(changed)).toMatchObject({
    status: 'checked',
    report: { status: 'needs_review' },
  });
  expect(() => dependencyPublicationDefinition(changed)).toThrow(DerivationPublicationError);
  expect(() => dependencyPublicationDefinition({ ...value, rules: [] })).toThrow(
    DerivationPublicationError,
  );
});
test('incorrect annotations cannot be certified even when formula matching succeeds', () => {
  const value = definition();
  value.referenceProof!.steps[1]!.dependencies = [a];
  expect(checkDependencyReference(value)).toMatchObject({
    status: 'checked',
    report: { status: 'needs_review' },
  });
  expect(() => dependencyPublicationDefinition(value)).toThrow(DerivationPublicationError);
  expect(() => dependencyReferenceSolution(value)).toThrow(DerivationAuthoringError);
});
test('unassessable configuration cannot publish or reveal a reference', () => {
  const value = { ...definition(), conclusion: '!'.repeat(33) + 'P' };
  expect(checkDependencyReference(value)).toMatchObject({
    status: 'checked',
    report: { status: 'unassessable' },
  });
  expect(() => dependencyPublicationDefinition(value)).toThrow(DerivationPublicationError);
  expect(() => dependencyReferenceSolution(value)).toThrow(DerivationAuthoringError);
});
test('ordinary content excludes references/explanations and cannot accept injected private fields', () => {
  const value = definition();
  const before = structuredClone(value);
  const content = dependencyContent(value);
  expect(content.format).toBe('dependency');
  expect(content).not.toHaveProperty('referenceProof');
  expect(content).not.toHaveProperty('explanation');
  expect(validateDependencyContent(content)).toEqual(content);
  expect(() =>
    validateDependencyContent({ ...content, referenceProof: value.referenceProof }),
  ).toThrow(DerivationAuthoringError);
  expect(
    dependencyDerivationContentSchema.safeParse({ ...content, explanation: value.explanation })
      .success,
  ).toBe(false);
  expect(value).toEqual(before);
});
test('privileged reference projection requires acceptance but does not itself grant disclosure', () => {
  const value = definition();
  const solution = dependencyReferenceSolution(value);
  expect(dependencyDerivationSolutionSchema.parse(solution)).toEqual(solution);
  expect(solution.referenceProof).toEqual(value.referenceProof);
  expect(solution.explanation).toEqual(value.explanation);
  expect(() => dependencyReferenceSolution({ ...value, referenceProof: null })).toThrow(
    DerivationAuthoringError,
  );
});
test.each([
  { format: 'fitch' },
  { definitionVersion: 2 },
  { checkerVersion: 2 },
  { ruleCatalogVersion: 2 },
  { accepted: true },
  { ownerId: a },
  { referenceProof: derivationDefinitionFixture().referenceProof },
  { referenceProof: { ...definition().referenceProof, format: 'fitch' } },
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
])('rejects mismatched formats, versions, cached flags and ambiguous configuration %#', (patch) => {
  expect(() => validateDependencyDefinition({ ...definition(), ...patch })).toThrow(
    DerivationAuthoringError,
  );
});
test('known rule IDs and common labels do not define custom inference behavior', () => {
  expect(() =>
    validateDependencyDefinition({
      ...definition(),
      rules: [{ id: 'custom_rule', label: 'Modus ponens' }],
    }),
  ).toThrow(DerivationAuthoringError);
  expect(
    dependencyDerivationDefinitionSchema.safeParse({
      ...definition(),
      rules: [{ id: 'implication_introduction', label: 'CP', behavior: 'anything' }],
    }).success,
  ).toBe(false);
  const value = definition();
  value.rules[0]!.label = '  Conditional proof  ';
  value.explanation = '  Private explanation  ';
  expect(validateDependencyDefinition(value).rules[0]!.label).toBe('Conditional proof');
  expect(validateDependencyDefinition(value).explanation).toBe('Private explanation');
});
test('format certification never reuses or converts an accepted Fitch reference', () => {
  const fitch = derivationDefinitionFixture();
  expect(fitchDerivationDefinitionSchema.safeParse(fitch).success).toBe(true);
  expect(() => checkDependencyReference(fitch)).toThrow(DerivationAuthoringError);
  expect(() => checkDependencyReference({ ...fitch, format: 'dependency' })).toThrow(
    DerivationAuthoringError,
  );
  expect(fitchDerivationDefinitionSchema.safeParse(definition()).success).toBe(false);
});
test('owner library and assignment admission accept dependency definitions while Fitch-only contracts stay separate', () => {
  const value = dependencyPublicationDefinition(definition());
  expect(libraryProblemDefinitionSchema.safeParse(value).success).toBe(true);
  expect(
    createLibraryProblemRequestSchema.safeParse({ title: 'Owner draft', definition: value })
      .success,
  ).toBe(true);
  expect(libraryProblemDefinition(value)).toEqual(value);
  expect(
    supportedAssignmentDefinition(value, {
      assessmentMode: 'graded',
      feedbackTiming: 'on_submission',
    }),
  ).toEqual(value);
  expect(
    fitchDerivationAnswerSchema.safeParse({ type: 'derivation', proof: value.referenceProof })
      .success,
  ).toBe(false);
});
