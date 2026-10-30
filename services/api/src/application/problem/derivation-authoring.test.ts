import { derivationDefinitionFixture as definition } from '../../../test/derivation-fixture';
import {
  derivationDefinitionSchema,
  derivationContentSchema,
  derivationSolutionSchema,
  normalizedRuleLabel,
  DERIVATION_AUTHORING_LIMITS,
  type DerivationDefinition,
} from '@logiclab/contracts/derivation';
import {
  createProblemRequestSchema,
  problemDefinitionSchema,
  type FitchProof,
} from '@logiclab/contracts';
import type {
  DerivationDefinition as StoredDefinition,
  DerivationReferenceProof,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import {
  validateDerivationDefinition,
  checkDerivationReference,
  derivationContent,
  derivationReferenceSolution,
  DerivationAuthoringError,
} from './derivation-authoring';
import {
  supportedProblemDefinition,
  requireTruthTableDefinition,
  UnsupportedProblemDefinitionError,
} from './definition-support';

const a = 'a1111111-1111-4111-8111-111111111111';
const b = 'b2222222-2222-4222-8222-222222222222';
const c = 'c3333333-3333-4333-8333-333333333333';

test('private derivation and reference JSON types are mutually assignable and round-trip', () => {
  const stored: StoredDefinition = derivationDefinitionSchema.parse(definition());
  const transported: DerivationDefinition = stored;
  const reference: DerivationReferenceProof = transported.referenceProof!;
  const proof: FitchProof = reference;
  expect(proof).toEqual(transported.referenceProof);
  expect(derivationDefinitionSchema.parse(JSON.parse(JSON.stringify(transported)))).toEqual(
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
  expect(validateDerivationDefinition(draft)).toEqual(draft);
  expect(checkDerivationReference(draft)).toEqual({ status: 'missing' });
  const partial = definition();
  partial.referenceProof!.steps[1]!.formula = 'P &';
  partial.referenceProof!.blocks[0]!.endId = null;
  expect(validateDerivationDefinition(partial)).toEqual(partial);
  const check = checkDerivationReference(partial);
  expect(check.status).toBe('checked');
  if (check.status === 'checked') expect(check.report.status).not.toBe('accepted');
});

test('reference checking uses the saved configuration and is independent of display labels', () => {
  const value = definition();
  const before = structuredClone(value);
  const accepted = checkDerivationReference(value);
  expect(accepted).toMatchObject({ status: 'checked', report: { status: 'accepted' } });
  value.rules[0]!.label = '→ Introduction';
  expect(checkDerivationReference(value)).toEqual(accepted);
  value.rules = [];
  expect(checkDerivationReference(value)).toMatchObject({
    status: 'checked',
    report: { status: 'needs_review' },
  });
  value.rules = before.rules;
  value.conclusion = 'Q -> Q';
  expect(checkDerivationReference(value)).toMatchObject({
    status: 'checked',
    report: { status: 'needs_review', target: 'not_established' },
  });
  expect(checkDerivationReference(before)).toEqual(accepted);
});

test('ordinary content whitelists statements/labels and excludes private references and explanations', () => {
  const value = definition();
  const before = structuredClone(value);
  const content = derivationContent(value);
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
  expect(derivationContentSchema.safeParse(value).success).toBe(false);
  content.rules[0]!.label = 'Changed returned copy';
  expect(value).toEqual(before);
});

test('privileged solution contains only a freshly accepted reference and its explanation', () => {
  const value = definition();
  const solution = derivationReferenceSolution(value);
  expect(derivationSolutionSchema.parse(solution)).toEqual({
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
  expect(() => derivationReferenceSolution({ ...value, referenceProof: null })).toThrow(
    DerivationAuthoringError,
  );
  expect(() => derivationReferenceSolution({ ...value, conclusion: 'Q' })).toThrow(
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
    derivationDefinitionSchema.safeParse({
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
  expect(validateDerivationDefinition(value).rules.map((rule) => rule.label)).toEqual([
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
    derivationDefinitionSchema.safeParse({ ...definition(), rules: [{ id: 'reiteration', label }] })
      .success,
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
  expect(derivationDefinitionSchema.safeParse({ ...definition(), ...patch }).success).toBe(false);
});

test('supported IDs are checked against the engine catalog, not labels or custom behavior', () => {
  expect(() =>
    validateDerivationDefinition({ ...definition(), rules: [{ id: 'custom_rule', label: 'MP' }] }),
  ).toThrow(DerivationAuthoringError);
  expect(
    derivationDefinitionSchema.safeParse({
      ...definition(),
      rules: [{ id: 'reiteration', label: 'R', behavior: 'anything' }],
    }).success,
  ).toBe(false);
});

test('staged persistence types do not enable live authoring, assignment evaluation or table dispatch', () => {
  const value: StoredDefinition = definition();
  expect(problemDefinitionSchema.safeParse(value).success).toBe(false);
  expect(
    createProblemRequestSchema.safeParse({ title: 'Premature', definition: value }).success,
  ).toBe(false);
  expect(() => supportedProblemDefinition(value)).toThrow(UnsupportedProblemDefinitionError);
  expect(() => requireTruthTableDefinition(value)).toThrow(UnsupportedProblemDefinitionError);
});
