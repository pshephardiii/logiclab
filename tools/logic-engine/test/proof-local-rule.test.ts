import {
  checkLocalRule,
  parseProofFormula,
  PROPOSITIONAL_RULE_CATALOG,
  PROPOSITIONAL_RULE_CATALOG_VERSION,
  type LocalRuleApplication,
  type PropositionalRuleId,
} from '../src/proof';

type Example = {
  rule: PropositionalRuleId;
  conclusion: string;
  lines: string[];
  subproofs?: [string, string][];
};
const valid: Example[] = [
  { rule: 'reiteration', conclusion: 'P', lines: ['P'] },
  { rule: 'and_introduction', conclusion: 'P & Q', lines: ['P', 'Q'] },
  { rule: 'and_elimination', conclusion: 'Q', lines: ['P & Q'] },
  { rule: 'or_introduction', conclusion: 'P | Q', lines: ['P'] },
  {
    rule: 'or_elimination',
    conclusion: 'R',
    lines: ['P | Q'],
    subproofs: [
      ['P', 'R'],
      ['Q', 'R'],
    ],
  },
  { rule: 'implication_introduction', conclusion: 'P -> Q', lines: [], subproofs: [['P', 'Q']] },
  { rule: 'implication_elimination', conclusion: 'Q', lines: ['P -> Q', 'P'] },
  { rule: 'negation_introduction', conclusion: '!P', lines: [], subproofs: [['P', '⊥']] },
  { rule: 'contradiction_introduction', conclusion: '⊥', lines: ['P', '!P'] },
  { rule: 'contradiction_elimination', conclusion: 'Q', lines: ['⊥'] },
  { rule: 'biconditional_introduction', conclusion: 'P <-> Q', lines: ['P -> Q', 'Q -> P'] },
  { rule: 'biconditional_elimination', conclusion: 'P -> Q', lines: ['P <-> Q'] },
  { rule: 'double_negation_introduction', conclusion: '!!P', lines: ['P'] },
  { rule: 'modus_tollens', conclusion: '!P', lines: ['P -> Q', '!Q'] },
  { rule: 'disjunctive_syllogism', conclusion: 'Q', lines: ['P | Q', '!P'] },
  { rule: 'hypothetical_syllogism', conclusion: 'P -> R', lines: ['P -> Q', 'Q -> R'] },
  { rule: 'double_negation_elimination', conclusion: 'P', lines: ['!!P'] },
  { rule: 'proof_by_contradiction', conclusion: 'P', lines: [], subproofs: [['!P', '⊥']] },
  { rule: 'excluded_middle', conclusion: 'P | !P', lines: [] },
];

function application(
  example: Example,
  substitute = (source: string) => source,
): LocalRuleApplication {
  const parse = (source: string) => parseProofFormula(substitute(source));
  return {
    ruleCatalogVersion: PROPOSITIONAL_RULE_CATALOG_VERSION,
    ruleId: example.rule,
    permittedRuleIds: [example.rule],
    conclusion: parse(example.conclusion),
    lines: example.lines.map(parse),
    subproofs: (example.subproofs ?? []).map(([assumption, conclusion]) => ({
      assumption: parse(assumption),
      conclusion: parse(conclusion),
    })),
  };
}

test.each(valid)('$rule accepts its exact pattern and reversed citation roles', (example) => {
  const input = application(example);
  expect(checkLocalRule(input)).toEqual({ status: 'valid' });
  expect(
    checkLocalRule({
      ...input,
      lines: [...input.lines].reverse(),
      subproofs: [...input.subproofs].reverse(),
    }),
  ).toEqual({ status: 'valid' });
});

test.each(valid)('$rule substitutes arbitrary compound formulas for metavariables', (example) => {
  const replacement: Record<string, string> = { P: '(S -> T)', Q: '!(U & V)', R: '(W <-> X)' };
  const input = application(example, (source) =>
    source.replace(/[PQR]/g, (name) => replacement[name]!),
  );
  expect(checkLocalRule(input)).toEqual({ status: 'valid' });
});

const invalid: Example[] = [
  { rule: 'reiteration', conclusion: 'Q', lines: ['P'] },
  { rule: 'and_introduction', conclusion: 'P | Q', lines: ['P', 'Q'] },
  { rule: 'and_elimination', conclusion: 'P | Q', lines: ['P & Q'] },
  { rule: 'or_introduction', conclusion: 'P | Q', lines: ['R'] },
  {
    rule: 'or_elimination',
    conclusion: 'R',
    lines: ['P | Q'],
    subproofs: [
      ['P', 'R'],
      ['Q', 'S'],
    ],
  },
  { rule: 'implication_introduction', conclusion: 'Q -> P', lines: [], subproofs: [['P', 'Q']] },
  { rule: 'implication_elimination', conclusion: 'P', lines: ['P -> Q', 'Q'] },
  { rule: 'negation_introduction', conclusion: '!P', lines: [], subproofs: [['Q', '⊥']] },
  { rule: 'contradiction_introduction', conclusion: '⊥', lines: ['P', '!Q'] },
  { rule: 'contradiction_elimination', conclusion: 'Q', lines: ['F'] },
  { rule: 'biconditional_introduction', conclusion: 'P <-> Q', lines: ['P -> Q', 'P -> Q'] },
  { rule: 'biconditional_elimination', conclusion: 'P', lines: ['P <-> Q'] },
  { rule: 'double_negation_introduction', conclusion: '!P', lines: ['P'] },
  { rule: 'modus_tollens', conclusion: '!Q', lines: ['P -> Q', '!P'] },
  { rule: 'disjunctive_syllogism', conclusion: 'Q', lines: ['P | Q', 'P'] },
  { rule: 'hypothetical_syllogism', conclusion: 'P -> R', lines: ['P -> Q', 'R -> Q'] },
  { rule: 'double_negation_elimination', conclusion: 'P', lines: ['!P'] },
  { rule: 'proof_by_contradiction', conclusion: 'P', lines: [], subproofs: [['P', '⊥']] },
  { rule: 'excluded_middle', conclusion: 'P | !Q', lines: [] },
];

test.each(invalid)('$rule rejects a near-miss despite correct citation counts', (example) => {
  expect(checkLocalRule(application(example))).toEqual({
    status: 'invalid',
    code: 'RULE_MISMATCH',
  });
});

test.each(valid)('$rule rejects extra or missing citations before matching', (example) => {
  const input = application(example);
  const invalidReference = { status: 'invalid', code: 'INVALID_REFERENCE' };
  expect(checkLocalRule({ ...input, lines: [...input.lines, parseProofFormula('P')] })).toEqual(
    invalidReference,
  );
  expect(
    checkLocalRule({
      ...input,
      subproofs: [
        ...input.subproofs,
        { assumption: parseProofFormula('P'), conclusion: parseProofFormula('Q') },
      ],
    }),
  ).toEqual(invalidReference);
  if (input.lines.length)
    expect(checkLocalRule({ ...input, lines: input.lines.slice(1) })).toEqual(invalidReference);
  if (input.subproofs.length)
    expect(checkLocalRule({ ...input, subproofs: input.subproofs.slice(1) })).toEqual(
      invalidReference,
    );
});

test.each(valid)(
  '$rule requires explicit permission even if other rules are enabled',
  (example) => {
    expect(
      checkLocalRule({
        ...application(example),
        permittedRuleIds: PROPOSITIONAL_RULE_CATALOG.filter((rule) => rule.id !== example.rule).map(
          (rule) => rule.id,
        ),
      }),
    ).toEqual({ status: 'invalid', code: 'RULE_DISABLED' });
  },
);

test.each<Example>([
  { rule: 'and_introduction', conclusion: 'P & P', lines: ['P', 'P'] },
  { rule: 'and_elimination', conclusion: 'P', lines: ['P & Q'] },
  { rule: 'or_introduction', conclusion: 'Q | P', lines: ['P'] },
  { rule: 'biconditional_elimination', conclusion: 'Q -> P', lines: ['P <-> Q'] },
  { rule: 'disjunctive_syllogism', conclusion: 'P', lines: ['P | Q', '!Q'] },
  { rule: 'double_negation_elimination', conclusion: '!P', lines: ['!!!P'] },
  { rule: 'negation_introduction', conclusion: '!!P', lines: [], subproofs: [['!P', '_|_']] },
  { rule: 'proof_by_contradiction', conclusion: '!P', lines: [], subproofs: [['!!P', '_|_']] },
  { rule: 'excluded_middle', conclusion: '!P | !!P', lines: [] },
  {
    rule: 'or_elimination',
    conclusion: 'Q',
    lines: ['P | P'],
    subproofs: [
      ['P', 'Q'],
      ['P', 'Q'],
    ],
  },
])('$rule accepts its other stated variants', (example) => {
  expect(checkLocalRule(application(example))).toEqual({ status: 'valid' });
});

test.each<Example>([
  { rule: 'reiteration', conclusion: 'Q & P', lines: ['P & Q'] },
  { rule: 'excluded_middle', conclusion: '!P | P', lines: [] },
  { rule: 'disjunctive_syllogism', conclusion: 'Q', lines: ['!P | Q', 'P'] },
  {
    rule: 'or_elimination',
    conclusion: 'R',
    lines: ['P | Q'],
    subproofs: [
      ['P', 'R'],
      ['P', 'R'],
    ],
  },
  { rule: 'proof_by_contradiction', conclusion: 'P', lines: [], subproofs: [['!P', 'Q & !Q']] },
  { rule: 'negation_introduction', conclusion: '!P', lines: [], subproofs: [['P', 'Q & !Q']] },
])('$rule never smuggles in another rule or a different case assumption', (example) => {
  expect(checkLocalRule(application(example))).toEqual({
    status: 'invalid',
    code: 'RULE_MISMATCH',
  });
});

test('every catalog entry has a valid and an invalid behavioral example', () => {
  const ids = PROPOSITIONAL_RULE_CATALOG.map((rule) => rule.id).sort();
  expect(valid.map((example) => example.rule).sort()).toEqual(ids);
  expect(invalid.map((example) => example.rule).sort()).toEqual(ids);
});

test('unknown IDs, labels, incomplete selection and unsupported versions have distinct outcomes', () => {
  const input = application(valid[0]!);
  for (const ruleId of ['custom_rule', 'Modus ponens', 'MP', ''])
    expect(checkLocalRule({ ...input, ruleId, permittedRuleIds: [ruleId] })).toEqual({
      status: 'invalid',
      code: 'UNKNOWN_RULE',
    });
  expect(checkLocalRule({ ...input, ruleId: null })).toEqual({
    status: 'unassessable',
    code: 'INCOMPLETE_PROOF',
  });
  expect(checkLocalRule({ ...input, ruleCatalogVersion: 2 })).toEqual({
    status: 'unassessable',
    code: 'UNSUPPORTED_VERSION',
  });
  expect(checkLocalRule({ ...input, permittedRuleIds: [] })).toEqual({
    status: 'invalid',
    code: 'RULE_DISABLED',
  });
});

test('local checking preserves its input formulas, reference order and permissions', () => {
  for (const example of valid) {
    const input = application(example);
    const before = structuredClone(input);
    checkLocalRule(input);
    expect(input).toEqual(before);
  }
});
