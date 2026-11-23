import { checkParsedRule } from '../../src/proof/parsed-rule';
import { readFormula } from '../../src/proof/proof-formulas';
import { proofBudget } from '../../src/proof/proof-budget';
import { structureDiagnostics } from '../../src/proof/structure-diagnostics';
import { PROPOSITIONAL_RULE_CATALOG, type PropositionalRuleId } from '../../src/proof';

const A = '(P & Q) & R';
const entered = 'P & Q & R';
type Example = {
  rule: PropositionalRuleId;
  conclusion: string;
  lines: string[];
  subproofs?: [string, string][];
  inherited?: boolean;
};
const examples: Example[] = [
  { rule: 'reiteration', conclusion: entered, lines: [A] },
  { rule: 'and_introduction', conclusion: `(${entered}) & S`, lines: [A, 'S'] },
  { rule: 'and_elimination', conclusion: entered, lines: [`(${A}) & S`] },
  { rule: 'or_introduction', conclusion: `(${entered}) v S`, lines: [A] },
  {
    rule: 'or_elimination',
    conclusion: entered,
    lines: ['S v T'],
    subproofs: [
      ['S', A],
      ['T', A],
    ],
  },
  {
    rule: 'implication_introduction',
    conclusion: `S -> (${entered})`,
    lines: [],
    subproofs: [['S', A]],
  },
  { rule: 'implication_elimination', conclusion: entered, lines: [`S -> (${A})`, 'S'] },
  { rule: 'negation_introduction', conclusion: `!(${entered})`, lines: [], subproofs: [[A, '⊥']] },
  { rule: 'contradiction_introduction', conclusion: '⊥', lines: [A, `!(${A})`], inherited: false },
  { rule: 'contradiction_elimination', conclusion: entered, lines: ['⊥'], inherited: false },
  {
    rule: 'biconditional_introduction',
    conclusion: `(${entered}) <-> S`,
    lines: [`(${A}) -> S`, `S -> (${A})`],
  },
  { rule: 'biconditional_elimination', conclusion: `(${entered}) -> S`, lines: [`(${A}) <-> S`] },
  { rule: 'double_negation_introduction', conclusion: `!!(${entered})`, lines: [A] },
  { rule: 'modus_tollens', conclusion: `!(${entered})`, lines: [`(${A}) -> S`, '!S'] },
  { rule: 'disjunctive_syllogism', conclusion: entered, lines: [`(${A}) v S`, '!S'] },
  {
    rule: 'hypothetical_syllogism',
    conclusion: `(${entered}) -> T`,
    lines: [`(${A}) -> S`, 'S -> T'],
  },
  { rule: 'double_negation_elimination', conclusion: entered, lines: [`!!(${A})`] },
  { rule: 'proof_by_contradiction', conclusion: entered, lines: [], subproofs: [[`!(${A})`, '⊥']] },
  {
    rule: 'excluded_middle',
    conclusion: `(${entered}) v !(${entered})`,
    lines: [],
    inherited: false,
  },
];

function match(example: Example, reverse = false) {
  const budget = proofBudget();
  const diagnostics = structureDiagnostics();
  const parse = (text: string) => readFormula(text, budget, diagnostics, undefined, 1);
  const current = parse(example.conclusion);
  const lines = example.lines.map(parse);
  const subproofs = (example.subproofs ?? []).map(([assumption, conclusion]) => ({
    assumption: parse(assumption),
    conclusion: parse(conclusion),
  }));
  const status = checkParsedRule(
    {
      ruleCatalogVersion: 2,
      formulaGroupingVersion: 1,
      premises: [],
      conclusion: example.conclusion,
      permittedRuleIds: [example.rule],
    },
    example.rule,
    current,
    reverse ? lines.reverse() : lines,
    reverse ? subproofs.reverse() : subproofs,
    0,
    budget,
    diagnostics,
  );
  expect(diagnostics.items).toEqual([]);
  expect(status).toBe('valid');
  if (current.status !== 'valid') throw new Error('Expected formula');
  return current.syntax!.source;
}

test.each(examples)(
  '$rule propagates only the formula parts used by its exact variant',
  (example) => {
    const text = match(example);
    if (example.inherited === false) expect(text).toBe(example.conclusion);
    else expect(text).toContain('(P & Q)');
    // Citation-role reversal must use the same success witnesses for symmetric variants.
    if (example.lines.length === 2 || (example.subproofs?.length ?? 0) === 2)
      expect(match(example, true)).toBe(text);
  },
);

test('the provenance table covers every retained rule variant', () => {
  expect(examples.map((example) => example.rule).sort()).toEqual(
    PROPOSITIONAL_RULE_CATALOG.map((rule) => rule.id).sort(),
  );
});

test('addition constrains the copied side only, even when the freely introduced side is identical', () => {
  expect(
    match({ rule: 'or_introduction', conclusion: `(${entered}) v (${entered})`, lines: [A] }),
  ).toBe('((P & Q) & R) v (P & Q & R)');
});
