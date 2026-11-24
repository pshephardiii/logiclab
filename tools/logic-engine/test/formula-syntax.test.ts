import {
  parseFormula,
  parseFormulaWithSyntax,
  generateTruthTable,
  FormulaParseError,
  FORMULA_LIMITS,
} from '../src';
import { parseProofFormula, parseProofFormulaWithSyntax, PROOF_FORMULA_LIMITS } from '../src/proof';
import { parseTruthTreeFormulaWithSyntax } from '../src/truth-tree';

const sources = [
  'P',
  '((P))',
  'P & Q & R',
  '(P & Q) & R',
  'P & (Q & R)',
  'P v Q v R',
  '[P v Q] v R',
  '(P v Q v R) v S',
  '!(P -> Q)',
  '~P ^ Q',
  'P -> Q -> R',
  '(P <-> Q) <-> R',
  'P v Q -> R v Y',
];

test.each(sources)(
  'syntax metadata preserves existing ASTs and covers every node: %s',
  (source) => {
    const parsed = parseFormulaWithSyntax(source);
    expect(parsed.source).toBe(source);
    expect(parsed.formula).toEqual(parseFormula(source));
    const pending = [parsed.formula];
    let count = 0;
    while (pending.length) {
      const node = pending.pop()!;
      expect(parsed.nodes.has(node)).toBe(true);
      const info = parsed.nodes.get(node)!;
      expect(info.span.end).toBeGreaterThan(info.span.start);
      expect(source.slice(info.span.start, info.span.end).trim()).not.toBe('');
      if (node.type === 'not') pending.push(node.operand);
      if (node.type === 'binary') pending.push(node.left, node.right);
      count++;
    }
    expect(parsed.nodes.size).toBe(count);
    expect(JSON.stringify(parsed.formula)).toBe(JSON.stringify(parseFormula(source)));
  },
);

test('explicit grouping is distinguishable from the identical default-associated semantic tree', () => {
  const implicit = parseFormulaWithSyntax('P v Q v R');
  const explicit = parseFormulaWithSyntax('(P v Q) v R');
  expect(implicit.formula).toEqual(explicit.formula);
  if (implicit.formula.type !== 'binary' || explicit.formula.type !== 'binary')
    throw new Error('fixture');
  expect(implicit.nodes.get(implicit.formula.left)!.groups).toEqual([]);
  expect(explicit.nodes.get(explicit.formula.left)!.groups).toEqual([
    { start: 0, end: 7, delimiter: 'parentheses' },
  ]);
  expect(explicit.nodes.get(explicit.formula)!.groups).toEqual([]);
});

test('a grouped chain retains its outer boundary without inventing boundaries inside it', () => {
  const parsed = parseFormulaWithSyntax('(P v Q v R) v S');
  if (parsed.formula.type !== 'binary' || parsed.formula.left.type !== 'binary')
    throw new Error('fixture');
  const chain = parsed.formula.left;
  expect(parsed.nodes.get(chain)!.groups).toEqual([
    { start: 0, end: 11, delimiter: 'parentheses' },
  ]);
  expect(parsed.nodes.get(chain.left)!.groups).toEqual([]);
  expect(parsed.nodes.get(chain.right)!.groups).toEqual([]);
});

test('nested mixed delimiters retain inner expression spans and inside-out group ranges', () => {
  const source = '  [(P -> Q)]  ';
  const parsed = parseFormulaWithSyntax(source);
  expect(parsed.nodes.get(parsed.formula)).toEqual({
    span: { start: 4, end: 10 },
    operatorPosition: 6,
    groups: [
      { start: 3, end: 11, delimiter: 'parentheses' },
      { start: 2, end: 12, delimiter: 'brackets' },
    ],
  });
  expect(source.slice(4, 10)).toBe('P -> Q');
});

test('redundant atom groups and negated compound groups remain syntax rather than AST operations', () => {
  const atom = parseFormulaWithSyntax('[(P)]');
  expect(atom.formula).toEqual({ type: 'variable', name: 'P' });
  expect(atom.nodes.size).toBe(1);
  expect(atom.nodes.get(atom.formula)!.groups).toHaveLength(2);
  const negated = parseProofFormulaWithSyntax('!(_|_ v P)');
  expect(negated.formula).toEqual(parseProofFormula('!(_|_ v P)'));
  if (negated.formula.type !== 'not' || negated.formula.operand.type !== 'binary')
    throw new Error('fixture');
  expect(negated.nodes.get(negated.formula)!.operatorPosition).toBe(0);
  expect(negated.nodes.get(negated.formula.operand)!.groups).toEqual([
    { start: 1, end: 10, delimiter: 'parentheses' },
  ]);
  const bottom = negated.formula.operand.left;
  expect(negated.nodes.get(bottom)!.span).toEqual({ start: 2, end: 5 });
});

test('proof and truth-tree entries share syntax while table-variable and contradiction bounds stay separate', () => {
  const source = 'P v Q -> R v Y';
  const proof = parseProofFormulaWithSyntax(source);
  expect(proof.formula).toEqual(parseProofFormula(source));
  expect(parseTruthTreeFormulaWithSyntax(source)).toEqual(proof);
  const letters = 'P & Q & R & S & T';
  expect(() => parseFormulaWithSyntax(letters)).toThrow(
    expect.objectContaining({ code: 'VARIABLE_LIMIT' }),
  );
  expect(parseProofFormulaWithSyntax(letters).formula).toEqual(parseProofFormula(letters));
  expect(() => parseFormulaWithSyntax('⊥')).toThrow(
    expect.objectContaining({ code: 'INVALID_CHARACTER' }),
  );
  expect(parseTruthTreeFormulaWithSyntax('⊥').formula).toEqual({ type: 'bottom' });
});

test.each(['P &', '[P)', 'P <-> Q <-> R', 'P @ Q', '!'.repeat(33) + 'P'])(
  'syntax capture preserves existing errors and positions: %s',
  (source) => {
    function failure(parse: (value: string) => unknown) {
      try {
        parse(source);
      } catch (error) {
        expect(error).toBeInstanceOf(FormulaParseError);
        const value = error as FormulaParseError;
        return { code: value.code, position: value.position, message: value.message };
      }
      throw new Error('Expected invalid fixture');
    }
    expect(failure(parseFormulaWithSyntax)).toEqual(failure(parseFormula));
    expect(failure(parseProofFormulaWithSyntax)).toEqual(failure(parseProofFormula));
  },
);

test('length limits, table values and canonical column identifiers are unchanged', () => {
  for (const [parse, limits] of [
    [parseFormulaWithSyntax, FORMULA_LIMITS],
    [parseProofFormulaWithSyntax, PROOF_FORMULA_LIMITS],
  ] as const)
    expect(() => parse('P'.repeat(limits.maxLength + 1))).toThrow(
      expect.objectContaining({ code: 'FORMULA_TOO_LONG', position: limits.maxLength }),
    );
  parseFormulaWithSyntax('((P ^ Q)) -> R');
  expect(generateTruthTable('((P ^ Q)) -> R')).toEqual(generateTruthTable('(P & Q) -> R'));
});
