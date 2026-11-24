import {
  truthTreeDefinitionSchema,
  truthTreeContentSchema,
  truthTreeSolutionSchema,
  truthTreeReferenceCheckSchema,
  TRUTH_TREE_AUTHORING_LIMITS,
} from '@logiclab/contracts/truth-tree-authoring';
import { isProofFormatAvailable, createProblemRequestSchema } from '@logiclab/contracts';
import { libraryProblemDefinitionSchema } from '@logiclab/contracts/problem-library';
import {
  validateTruthTreeDefinition,
  validateTruthTreeContent,
  checkTruthTreeReference,
  truthTreePublicationDefinition,
  truthTreeContent,
  truthTreeReferenceSolution,
  hasFinishedTruthTreeReference,
} from './authoring';
import { TruthTreeAuthoringError, TruthTreePublicationError } from './errors';
import { authoringDefinition } from '../library-definition';
import { supportedAssignmentDefinition } from '../../assignment/definition-support';
import type {
  TruthTreeDefinition as StoredDefinition,
  TruthTree as StoredTree,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import {
  truthTreeDefinitionFixture as fixture,
  truthTreeIds,
  truthTreeShortCounterexampleFixture,
} from '../../../../test/truth-tree-fixture';

test.each(['valid', 'invalid'] as const)(
  'a %s argument has a freshly verified private reference',
  (outcome) => {
    const definition = fixture(outcome);
    const before = structuredClone(definition);
    expect(truthTreeDefinitionSchema.parse(JSON.parse(JSON.stringify(definition)))).toEqual(
      definition,
    );
    const check = checkTruthTreeReference(definition);
    expect(truthTreeReferenceCheckSchema.safeParse(check).success).toBe(true);
    expect(check).toMatchObject({
      status: 'checked',
      report: { status: 'verified', argumentStatus: outcome },
    });
    expect(truthTreePublicationDefinition(definition)).toEqual(definition);
    expect(definition).toEqual(before);
  },
);

test('drafts retain unfinished statements and a missing reference', () => {
  const definition = {
    ...fixture(),
    premises: [{ id: truthTreeIds.premise, formula: '' }],
    conclusion: '',
    referenceTree: null,
    explanation: null,
  };
  expect(validateTruthTreeDefinition(definition)).toEqual(definition);
  expect(checkTruthTreeReference(definition)).toEqual({ status: 'missing' });
  expect(() => truthTreePublicationDefinition(definition)).toThrow(TruthTreePublicationError);
  expect(() => truthTreeReferenceSolution(definition)).toThrow(TruthTreeAuthoringError);
});

test('publication distinguishes missing references from rejected references', () => {
  expect(() => truthTreePublicationDefinition({ ...fixture(), referenceTree: null })).toThrow(
    expect.objectContaining({ code: 'missing_reference' }),
  );
  const rejected = fixture();
  rejected.conclusion = 'Q';
  expect(() => truthTreePublicationDefinition(rejected)).toThrow(
    expect.objectContaining({ code: 'rejected_reference' }),
  );
});

test('partial tree selections and malformed entered formulas are retained without certifying publication', () => {
  const definition = fixture();
  definition.referenceTree!.rootBranchId = null;
  expect(validateTruthTreeDefinition(definition)).toEqual(definition);
  expect(checkTruthTreeReference(definition)).toMatchObject({
    status: 'checked',
    report: { status: 'incomplete' },
  });
  expect(() => truthTreePublicationDefinition(definition)).toThrow(TruthTreePublicationError);
  definition.referenceTree!.rootBranchId = truthTreeIds.root;
  definition.referenceTree!.occurrences[0]!.formula = 'P &';
  expect(validateTruthTreeDefinition(definition)).toEqual(definition);
  expect(checkTruthTreeReference(definition)).toMatchObject({
    status: 'checked',
    report: { status: 'invalid' },
  });
  expect(() => truthTreeReferenceSolution(definition)).toThrow(TruthTreeAuthoringError);
});

test.each(['conclusion', 'premise_formula', 'premise_identity', 'closure'] as const)(
  'changing %s invalidates the exact saved reference',
  (field) => {
    const definition = fixture();
    expect(checkTruthTreeReference(definition)).toMatchObject({
      status: 'checked',
      report: { status: 'verified' },
    });
    if (field === 'conclusion') definition.conclusion = 'Q';
    if (field === 'premise_formula') definition.premises[0]!.formula = 'Q';
    if (field === 'premise_identity')
      definition.premises[0]!.id = 'e5555555-5555-4555-8555-555555555555';
    if (field === 'closure')
      definition.referenceTree!.branches[0]!.ending = {
        kind: 'closed',
        closure: { kind: 'falsity', occurrenceId: truthTreeIds.premiseOccurrence },
      };
    expect(checkTruthTreeReference(definition)).not.toMatchObject({
      status: 'checked',
      report: { status: 'verified' },
    });
    expect(() => truthTreePublicationDefinition(definition)).toThrow(TruthTreePublicationError);
    expect(() => truthTreeReferenceSolution(definition)).toThrow(TruthTreeAuthoringError);
  },
);

test('notation aliases match without rewriting the saved statement or explanation', () => {
  const definition = fixture();
  definition.conclusion = '[P]';
  definition.explanation = '  Instructor explanation  ';
  const before = structuredClone(definition);
  expect(truthTreePublicationDefinition(definition).explanation).toBe('Instructor explanation');
  expect(definition).toEqual(before);
});

test('invalid authoritative syntax yields an unassessable reference, never publication or reveal', () => {
  const definition = fixture();
  definition.conclusion = 'P &';
  expect(validateTruthTreeDefinition(definition)).toEqual(definition);
  expect(checkTruthTreeReference(definition)).toMatchObject({
    status: 'checked',
    report: { status: 'unassessable' },
  });
  expect(() => truthTreePublicationDefinition(definition)).toThrow(TruthTreePublicationError);
  expect(() => truthTreeReferenceSolution(definition)).toThrow(TruthTreeAuthoringError);
});

test('resource-limited retained draft structure cannot be certified or revealed', () => {
  const definition = fixture();
  const branchId = (index: number) =>
    `${index.toString(16).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
  definition.referenceTree!.rootBranchId = branchId(0);
  definition.referenceTree!.branches = Array.from({ length: 34 }, (_, index) => ({
    id: branchId(index),
    parentId: index === 0 ? null : branchId(index - 1),
    occurrenceIds:
      index === 0 ? [truthTreeIds.premiseOccurrence, truthTreeIds.conclusionOccurrence] : [],
    ending:
      index === 33
        ? { kind: 'open' }
        : { kind: 'split', expansionId: null, childBranchIds: [branchId(index + 1)] },
  }));
  expect(validateTruthTreeDefinition(definition)).toEqual(definition);
  expect(checkTruthTreeReference(definition)).toMatchObject({
    status: 'checked',
    report: { status: 'unassessable' },
  });
  expect(() => truthTreePublicationDefinition(definition)).toThrow(TruthTreePublicationError);
  expect(() => truthTreeReferenceSolution(definition)).toThrow(TruthTreeAuthoringError);
});

test.each(['valid', 'invalid'] as const)(
  'public content for %s excludes all private answers and reference identities',
  (outcome) => {
    const definition = fixture(outcome);
    const content = truthTreeContent(definition);
    expect(validateTruthTreeContent(content)).toEqual(content);
    for (const key of [
      'referenceTree',
      'explanation',
      'argumentStatus',
      'counterexample',
      'report',
    ])
      expect(content).not.toHaveProperty(key);
    expect(JSON.stringify(content)).not.toContain('PRIVATE_TRUTH_TREE_EXPLANATION');
    expect(JSON.stringify(content)).not.toContain(truthTreeIds.root);
    expect(
      truthTreeContentSchema.safeParse({ ...content, referenceTree: definition.referenceTree })
        .success,
    ).toBe(false);
    expect(
      truthTreeContentSchema.safeParse({ ...content, explanation: definition.explanation }).success,
    ).toBe(false);
  },
);

test.each(['valid', 'invalid'] as const)(
  'privileged %s reveal includes only a freshly verified outcome and reference',
  (outcome) => {
    const definition = fixture(outcome);
    const solution = truthTreeReferenceSolution(definition);
    expect(truthTreeSolutionSchema.parse(JSON.parse(JSON.stringify(solution)))).toEqual(solution);
    expect(solution.referenceTree).toEqual(definition.referenceTree);
    expect(solution.explanation).toBe(definition.explanation);
    expect(solution.argumentStatus).toBe(outcome);
    expect(solution.counterexample).toEqual(
      outcome === 'valid'
        ? null
        : { branchId: truthTreeIds.root, assignment: { P: true, Q: false } },
    );
  },
);

test('omitted explanations normalize to null only in privileged reveal', () => {
  const definition = fixture();
  delete definition.explanation;
  expect(truthTreeReferenceSolution(definition).explanation).toBeNull();
  expect(truthTreeContent(definition)).not.toHaveProperty('explanation');
});

test.each([
  { ...fixture(), type: 'derivation', format: 'tree' },
  { ...fixture(), definitionVersion: 2 },
  { ...fixture(), checkerVersion: 2 },
  { ...fixture(), ruleCatalogVersion: 2 },
  { ...fixture(), conclusion: 'P'.repeat(257) },
  { ...fixture(), premises: Array(51).fill(fixture().premises[0]) },
  { ...fixture(), explanation: 'x'.repeat(TRUTH_TREE_AUTHORING_LIMITS.explanation + 1) },
  { ...fixture(), argumentStatus: 'valid' },
  { ...fixture(), counterexample: { P: true } },
  { ...fixture(), accepted: true },
  { ...fixture(), referenceTree: { ...fixture().referenceTree, format: 'tree' } },
])(
  'unsupported versions, formats, overflows and cached answer claims are rejected: %#',
  (value) => {
    expect(() => validateTruthTreeDefinition(value)).toThrow(TruthTreeAuthoringError);
  },
);

test('duplicate premise identities are rejected after UUID case normalization', () => {
  const definition = fixture();
  definition.premises.push({ id: truthTreeIds.premise.toUpperCase(), formula: 'Q' });
  expect(() => validateTruthTreeDefinition(definition)).toThrow(TruthTreeAuthoringError);
});

test('reveal contracts reject missing/mismatched counterexamples and foreign branch identities', () => {
  const valid = truthTreeReferenceSolution(fixture());
  const invalid = truthTreeReferenceSolution(fixture('invalid'));
  expect(truthTreeSolutionSchema.safeParse({ ...invalid, counterexample: null }).success).toBe(
    false,
  );
  expect(
    truthTreeSolutionSchema.safeParse({ ...valid, counterexample: invalid.counterexample }).success,
  ).toBe(false);
  expect(
    truthTreeSolutionSchema.safeParse({
      ...invalid,
      counterexample: { ...invalid.counterexample, branchId: truthTreeIds.premise },
    }).success,
  ).toBe(false);
});

test('truth-tree library and assignment admission stay separate from natural-deduction formats', () => {
  const definition = fixture();
  expect(truthTreeDefinitionSchema.safeParse(definition).success).toBe(true);
  expect(libraryProblemDefinitionSchema.safeParse(definition).success).toBe(true);
  expect(createProblemRequestSchema.safeParse({ title: 'Truth tree', definition }).success).toBe(
    false,
  );
  expect(authoringDefinition(definition)).toEqual({ ...definition, formulaGroupingVersion: 1 });
  expect(() =>
    supportedAssignmentDefinition(definition, {
      assessmentMode: 'graded',
      feedbackTiming: 'on_submission',
    }),
  ).not.toThrow();
  expect(isProofFormatAvailable('truth_tree')).toBe(false);
  expect(isProofFormatAvailable('tree')).toBe(false);
});

test('stored truth-tree/reference JSON types exactly round-trip through transport contracts', () => {
  const stored: StoredDefinition = fixture();
  const transported: ReturnType<typeof fixture> = stored;
  const reference: StoredTree = transported.referenceTree!;
  expect(reference).toEqual(stored.referenceTree);
  expect(truthTreeDefinitionSchema.parse(JSON.parse(JSON.stringify(stored)))).toEqual(transported);
});

test.each(['valid', 'invalid'] as const)(
  'catalog-2 %s references publish and reveal without changing their pinned choices',
  (outcome) => {
    const definition = fixture(outcome, 2);
    const before = structuredClone(definition);
    expect(authoringDefinition(definition)).toEqual(definition);
    expect(truthTreePublicationDefinition(definition)).toEqual(definition);
    const check = checkTruthTreeReference(definition);
    expect(check).toMatchObject({
      status: 'checked',
      report: { ruleCatalogVersion: 2, status: 'verified', argumentStatus: outcome },
    });
    const content = truthTreeContent(definition);
    expect(content).toMatchObject({ ruleCatalogVersion: 2, formulaGroupingVersion: 1 });
    expect(content).not.toHaveProperty('referenceTree');
    expect(content).not.toHaveProperty('explanation');
    const solution = truthTreeReferenceSolution(definition);
    expect(solution).toMatchObject({
      ruleCatalogVersion: 2,
      formulaGroupingVersion: 1,
      argumentStatus: outcome,
    });
    expect(solution.referenceTree).toEqual(definition.referenceTree);
    expect(definition).toEqual(before);
  },
);

test('new explicit boundaries invalidate an old extraction without rewriting its saved reference', () => {
  const definition = fixture('valid', 2);
  definition.premises[0]!.formula = '(P & Q) & R';
  // Even matching entered text cannot erase the instructor's new boundary.
  definition.referenceTree!.occurrences[0]!.formula = 'P & Q & R';
  expect(validateTruthTreeDefinition(definition)).toEqual(definition);
  expect(checkTruthTreeReference(definition)).toMatchObject({
    status: 'checked',
    report: { status: 'invalid' },
  });
  expect(() => truthTreePublicationDefinition(definition)).toThrow(TruthTreePublicationError);
  expect(() => truthTreeReferenceSolution(definition)).toThrow(TruthTreeAuthoringError);
});

test('catalog-2 disjunction references pin their split and require all paths for completion', () => {
  const definition = truthTreeShortCounterexampleFixture(2);
  expect(truthTreePublicationDefinition(definition)).toEqual(definition);
  expect(hasFinishedTruthTreeReference(definition)).toBe(false);
  expect(truthTreeReferenceSolution(definition).referenceTree.expansions[0]!.chainChoice).toEqual({
    ruleId: 'disjunction',
    splitIndex: 1,
  });
  definition.referenceTree!.expansions[0]!.chainChoice = { ruleId: 'disjunction', splitIndex: 2 };
  expect(() => truthTreePublicationDefinition(definition)).toThrow(TruthTreePublicationError);
});
