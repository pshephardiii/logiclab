import {
  formulaChainMembers,
  formulaGroupingIssues,
  requireExplicitGrouping,
  FORMULA_GROUPING_POLICY_VERSION,
  FormulaParseError,
  parseFormula,
  parseFormulaWithSyntax,
  generateTruthTable,
} from '../src';
import { parseProofFormulaWithSyntax } from '../src/proof';
import { parseTruthTreeFormulaWithSyntax } from '../src/truth-tree';

const parsers = [
  parseFormulaWithSyntax,
  parseProofFormulaWithSyntax,
  parseTruthTreeFormulaWithSyntax,
];

const grouped = [
  'P',
  '!P & Q',
  'P ^ Q ^ R',
  'P v Q v R',
  '(P v Q) -> (R v Y)',
  '[P v Q] -> [R v Y]',
  '(P & Q) v R',
  'P & (Q v R)',
  '(P & Q) & R',
  'P & (Q & R)',
  '(P v Q v R) v S',
  '((P)) -> Q',
  '!(P & Q)',
  '(P -> Q) & (R -> S)',
  '(P <-> Q) -> R',
  // This policy does not change existing right-association or grant conditional-chain shortcuts.
  'P -> Q -> R',
];

test.each(grouped)('shared grouping policy accepts %s without altering source or AST', (source) => {
  for (const parse of parsers) {
    const parsed = parse(source);
    const before = structuredClone(parsed);
    expect(formulaGroupingIssues(parsed)).toEqual([]);
    expect(requireExplicitGrouping(parsed)).toBe(parsed);
    expect(parsed).toEqual(before);
  }
});

test.each([
  'P v Q -> R v Y',
  'P & Q v R',
  'P v Q & R',
  '(P v Q -> R)',
  '[P & Q v R]',
  '!(P & Q v R)',
  'P -> Q & R',
  'P & Q <-> R',
  'P -> Q <-> R',
  'P v Q ^ R',
])('mixed binary operators require meaningful internal groups: %s', (source) => {
  for (const parse of parsers) {
    const parsed = parse(source);
    const before = structuredClone(parsed);
    expect(formulaGroupingIssues(parsed).length).toBeGreaterThan(0);
    expect(() => requireExplicitGrouping(parsed)).toThrow(
      expect.objectContaining({ code: 'GROUPING_REQUIRED' }),
    );
    expect(parsed).toEqual(before);
  }
});

test('grouping diagnostics identify the exact expression/operator in source order', () => {
  const source = 'P v Q -> R v Y';
  const parsed = parseFormulaWithSyntax(source);
  expect(FORMULA_GROUPING_POLICY_VERSION).toBe(1);
  expect(formulaGroupingIssues(parsed)).toEqual([
    {
      code: 'GROUPING_REQUIRED',
      position: 2,
      span: { start: 0, end: 5 },
      parentOperator: 'implies',
      childOperator: 'or',
      message: expect.stringContaining('∨ groups with →'),
    },
    {
      code: 'GROUPING_REQUIRED',
      position: 11,
      span: { start: 9, end: 14 },
      parentOperator: 'implies',
      childOperator: 'or',
      message: expect.stringContaining('∨ groups with →'),
    },
  ]);
  try {
    requireExplicitGrouping(parsed);
    throw new Error('Expected grouping error');
  } catch (error) {
    expect(error).toBeInstanceOf(FormulaParseError);
    expect(error).toMatchObject({
      position: 2,
      code: 'GROUPING_REQUIRED',
      message: expect.stringContaining('character 3'),
    });
  }
  const nested = parseFormulaWithSyntax('P & Q v R -> S');
  expect(formulaGroupingIssues(nested).map((issue) => issue.position)).toEqual([2, 6]);
});

test.each([
  ['P & Q & R', ['P', 'Q', 'R']],
  ['P v Q v R v S', ['P', 'Q', 'R', 'S']],
  ['(P & Q) & R & S', ['(P & Q)', 'R', 'S']],
  ['P & (Q & R)', ['P', '(Q & R)']],
  ['[P v Q] v R', ['[P v Q]', 'R']],
  ['((P v Q)) v R', ['((P v Q))', 'R']],
  ['(P v Q v R)', ['P', 'Q', 'R']],
  ['(P -> Q) v R', ['(P -> Q)', 'R']],
  ['P & P & Q', ['P', 'P', 'Q']],
  ['P ^ Q & R', ['P', 'Q', 'R']],
  ['!P & Q', ['!P', 'Q']],
  ['!(P v Q)', ['!(P v Q)']],
  ['P -> Q -> R', ['P -> Q -> R']],
] as const)(
  'chain members retain order, duplicates and explicit boundaries: %s',
  (source, expected) => {
    const parsed = requireExplicitGrouping(parseProofFormulaWithSyntax(source));
    const before = structuredClone(parsed);
    const members = formulaChainMembers(parsed);
    const text = members.map((node) => {
      const syntax = parsed.nodes.get(node)!;
      const span = syntax.groups.at(-1) ?? syntax.span;
      return source.slice(span.start, span.end);
    });
    expect(text).toEqual(expected);
    expect(new Set(members).size).toBe(members.length);
    expect(parsed).toEqual(before);
  },
);

test('selected subchains open their own outer group but never cross descendant groups or negation', () => {
  const parsed = parseProofFormulaWithSyntax('(P v Q v R) v S');
  if (parsed.formula.type !== 'binary') throw new Error('fixture');
  expect(formulaChainMembers(parsed)).toHaveLength(2);
  expect(formulaChainMembers(parsed, parsed.formula.left)).toHaveLength(3);
  expect(() => formulaChainMembers(parsed, parseFormula('P'))).toThrow('Select a node');
  const bottom = parseProofFormulaWithSyntax('⊥');
  expect(formulaChainMembers(bottom)).toEqual([bottom.formula]);
});

test('old parsing, table columns and resource limits remain authoritative outside opt-in policy', () => {
  expect(parseFormula('P & Q v R')).toEqual(parseFormula('(P & Q) v R'));
  expect(generateTruthTable('P & Q v R')).toEqual(generateTruthTable('(P & Q) v R'));
  expect(() => parseProofFormulaWithSyntax('!'.repeat(33) + 'P')).toThrow(
    expect.objectContaining({ code: 'NESTING_LIMIT' }),
  );
  expect(() => parseProofFormulaWithSyntax('P'.repeat(257))).toThrow(
    expect.objectContaining({ code: 'FORMULA_TOO_LONG' }),
  );
  expect(() => parseFormulaWithSyntax('P & Q & R & S & T')).toThrow(
    expect.objectContaining({ code: 'VARIABLE_LIMIT' }),
  );
});
