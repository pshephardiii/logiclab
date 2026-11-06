import { DerivationAuthoringError } from '../errors';
import { derivationDefinitionFixture as definition } from '../../../../../test/derivation-fixture';
import {
  fitchDerivationDefinitionSchema,
  fitchDerivationContentSchema,
  fitchDerivationSolutionSchema,
  normalizedRuleLabel,
  DERIVATION_AUTHORING_LIMITS,
  type FitchDerivationDefinition,
} from '@logiclab/contracts/derivation';
import {
  createProblemRequestSchema,
  objectiveProblemDefinitionSchema,
  type FitchProof,
} from '@logiclab/contracts';
import type {
  FitchDerivationDefinition as StoredDefinition,
  FitchReferenceProof,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import {
  validateFitchDefinition,
  checkFitchReference,
  fitchContent,
  fitchReferenceSolution,
} from './authoring';
import {
  validateObjectiveDefinition,
  requireTruthTableDefinition,
  UnsupportedProblemDefinitionError,
} from '../../definition-support';

const a = 'a1111111-1111-4111-8111-111111111111';
const b = 'b2222222-2222-4222-8222-222222222222';
const c = 'c3333333-3333-4333-8333-333333333333';

test('private derivation and reference JSON types are mutually assignable and round-trip', () => {
  const stored: StoredDefinition = fitchDerivationDefinitionSchema.parse(definition());
  const transported: FitchDerivationDefinition = stored;
  const reference: FitchReferenceProof = transported.referenceProof!;
  const proof: FitchProof = reference;
  expect(proof).toEqual(transported.referenceProof);
  expect(fitchDerivationDefinitionSchema.parse(JSON.parse(JSON.stringify(transported)))).toEqual(
    definition(),
  );
});

test('incomplete statement/reference work is retained without certifying publication', () => {
  const draft = {
    ...definition(),
    premises: [{ id: a, formula: '' }],
    conclusion: '',
    rules: [],
    referenceProof: null,
    explanation: null,
  };
  expect(validateFitchDefinition(draft)).toEqual(draft);
  expect(checkFitchReference(draft)).toEqual({ status: 'missing' });
  const partial = definition();
  partial.referenceProof!.steps[1]!.formula = 'P &';
  partial.referenceProof!.blocks[0]!.endId = null;
  expect(validateFitchDefinition(partial)).toEqual(partial);
  const check = checkFitchReference(partial);
  expect(check.status).toBe('checked');
  if (check.status === 'checked') expect(check.report.status).not.toBe('accepted');
});

test('reference checking uses the saved configuration and is independent of display labels', () => {
  const value = definition();
  const before = structuredClone(value);
  const accepted = checkFitchReference(value);
  expect(accepted).toMatchObject({ status: 'checked', report: { status: 'accepted' } });
  value.rules[0]!.label = '→ Introduction';
  expect(checkFitchReference(value)).toEqual(accepted);
  value.rules = [];
  expect(checkFitchReference(value)).toMatchObject({
    status: 'checked',
    report: { status: 'needs_review' },
  });
  value.rules = before.rules;
  value.conclusion = 'Q -> Q';
  expect(checkFitchReference(value)).toMatchObject({
    status: 'checked',
    report: { status: 'needs_review', target: 'not_established' },
  });
  expect(checkFitchReference(before)).toEqual(accepted);
});

test('ordinary content whitelists statements/labels and excludes private references and explanations', () => {
  const value = definition();
  const before = structuredClone(value);
  const content = fitchContent(value);
  expect(content).toEqual({
    type: value.type,
    definitionVersion: 1,
    format: 'fitch',
    ruleCatalogVersion: 1,
    checkerVersion: 1,
    premises: [],
    conclusion: value.conclusion,
    rules: value.rules,
  });
  expect(content).not.toHaveProperty('referenceProof');
  expect(content).not.toHaveProperty('explanation');
  expect(fitchDerivationContentSchema.safeParse(value).success).toBe(false);
  content.rules[0]!.label = 'Changed returned copy';
  expect(value).toEqual(before);
});

test('privileged solution contains only a freshly accepted reference and its explanation', () => {
  const value = definition();
  const solution = fitchReferenceSolution(value);
  expect(fitchDerivationSolutionSchema.parse(solution)).toEqual({
    type: 'derivation',
    definitionVersion: 1,
    format: 'fitch',
    ruleCatalogVersion: 1,
    checkerVersion: 1,
    referenceProof: value.referenceProof,
    explanation: value.explanation,
  });
  solution.referenceProof.steps[0]!.formula = 'Q';
  expect(value.referenceProof!.steps[0]!.formula).toBe('P');
  expect(() => fitchReferenceSolution({ ...value, referenceProof: null })).toThrow(
    DerivationAuthoringError,
  );
  expect(() => fitchReferenceSolution({ ...value, conclusion: 'Q' })).toThrow(
    DerivationAuthoringError,
  );
});

test.each([
  ['MP', ' mp '],
  ['Modus ponens', 'MODUS  PONENS'],
  ['→E', '→ｅ'],
  ['Café', 'Cafe\u0301'],
])('normalized labels reject collisions between %s and %s', (first, second) => {
  expect(normalizedRuleLabel(first)).toBe(normalizedRuleLabel(second));
  expect(
    fitchDerivationDefinitionSchema.safeParse({
      ...definition(),
      rules: [
        { id: 'implication_elimination', label: first },
        { id: 'and_elimination', label: second },
      ],
    }).success,
  ).toBe(false);
});

test('effective label spelling is preserved and distinct enabled rules remain selectable', () => {
  const value = {
    ...definition(),
    rules: [
      { id: 'implication_introduction', label: '  Conditional proof  ' },
      { id: 'and_elimination', label: '∧E' },
    ],
  };
  expect(validateFitchDefinition(value).rules.map((rule) => rule.label)).toEqual([
    'Conditional proof',
    '∧E',
  ]);
});

test.each([
  '',
  ' '.repeat(3),
  'X'.repeat(DERIVATION_AUTHORING_LIMITS.ruleLabel + 1),
  'M\u200bP',
  'MP\nCP',
])('rejects blank, oversized or invisible/control labels: %#', (label) => {
  expect(
    fitchDerivationDefinitionSchema.safeParse({
      ...definition(),
      rules: [{ id: 'reiteration', label }],
    }).success,
  ).toBe(false);
});

test.each([
  { definitionVersion: 2 },
  { format: 'tree' },
  { ruleCatalogVersion: 2 },
  { checkerVersion: 2 },
  { referenceAccepted: true },
  { report: { status: 'accepted' } },
  { conclusion: 'P'.repeat(257) },
  {
    rules: [
      { id: 'implication_introduction', label: 'CP' },
      { id: 'implication_introduction', label: '→I' },
    ],
  },
  {
    premises: [
      { id: a, formula: 'P' },
      { id: a.toUpperCase(), formula: 'Q' },
    ],
  },
])('rejects unsupported or ambiguous authoring configuration: %#', (patch) => {
  expect(fitchDerivationDefinitionSchema.safeParse({ ...definition(), ...patch }).success).toBe(
    false,
  );
});

test('supported IDs are checked against the engine catalog, not labels or custom behavior', () => {
  expect(() =>
    validateFitchDefinition({ ...definition(), rules: [{ id: 'custom_rule', label: 'MP' }] }),
  ).toThrow(DerivationAuthoringError);
  expect(
    fitchDerivationDefinitionSchema.safeParse({
      ...definition(),
      rules: [{ id: 'reiteration', label: 'R', behavior: 'anything' }],
    }).success,
  ).toBe(false);
});

test('staged persistence types do not enable live authoring, assignment evaluation or table dispatch', () => {
  const value: StoredDefinition = definition();
  expect(objectiveProblemDefinitionSchema.safeParse(value).success).toBe(false);
  expect(
    createProblemRequestSchema.safeParse({ title: 'Premature', definition: value }).success,
  ).toBe(false);
  expect(() => validateObjectiveDefinition(value)).toThrow(UnsupportedProblemDefinitionError);
  expect(() => requireTruthTableDefinition(value)).toThrow(UnsupportedProblemDefinitionError);
});
