import { FormulaParseError, generateTruthTable } from '../src';

test('generates a known conjunction table with given and answer columns', () => {
  const table = generateTruthTable('P & Q');
  expect(table.variables).toEqual(['P', 'Q']);
  expect(table.columns).toEqual([
    { id: 'var:v1:P', label: 'P', kind: 'given', isFinal: false },
    { id: 'var:v1:Q', label: 'Q', kind: 'given', isFinal: false },
    { id: 'expr:v1:(P ∧ Q)', label: '(P ∧ Q)', kind: 'answer', isFinal: true },
  ]);
  expect(table.rows.map((row) => Object.values(row.values))).toEqual([
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, false],
  ]);
  expect(table.rows.map((row) => row.id)).toEqual([
    'row:v1:P=T;Q=T',
    'row:v1:P=T;Q=F',
    'row:v1:P=F;Q=T',
    'row:v1:P=F;Q=F',
  ]);
});

test('orders variables alphabetically regardless of source order', () => {
  const table = generateTruthTable('R -> P');
  expect(table.variables).toEqual(['P', 'R']);
  expect(table.rows.map((row) => Object.values(row.values))).toEqual([
    [true, true, true],
    [true, false, true],
    [false, true, false],
    [false, false, true],
  ]);
});

test('puts compound children before parents and the final expression last', () => {
  const table = generateTruthTable('(P & Q) -> !R');
  expect(
    table.columns.filter((column) => column.kind === 'answer').map((column) => column.label),
  ).toEqual(['(P ∧ Q)', '¬R', '((P ∧ Q) → ¬R)']);
  expect(table.rows.map((row) => row.values['expr:v1:((P ∧ Q) → ¬R)'])).toEqual([
    false,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
  ]);
});

test('deduplicates identical structures but not merely equivalent expressions', () => {
  const table = generateTruthTable('(P & Q) | ((P & Q) & (Q & P))');
  expect(
    table.columns.filter((column) => column.kind === 'answer').map((column) => column.label),
  ).toEqual(['(P ∧ Q)', '(Q ∧ P)', '((P ∧ Q) ∧ (Q ∧ P))', '((P ∧ Q) ∨ ((P ∧ Q) ∧ (Q ∧ P)))']);
});

test('IDs and output are identical across aliases, whitespace, and redundant parentheses', () => {
  expect(generateTruthTable(' ! ( P & Q ) -> R ')).toEqual(generateTruthTable('((¬(P ∧ Q) → R))'));
});

test('structurally different grouping produces different final column IDs', () => {
  const finalId = (source: string) =>
    generateTruthTable(source).columns.find((column) => column.isFinal)!.id;
  expect(finalId('P -> Q -> R')).not.toBe(finalId('(P -> Q) -> R'));
});

test('an intermediate expression keeps its ID when reused in another formula', () => {
  const id = generateTruthTable('P & Q').columns.find((column) => column.isFinal)!.id;
  expect(generateTruthTable('!(P & Q) -> R').columns.some((column) => column.id === id)).toBe(true);
});

test('a lone variable has distinct given and final answer columns', () => {
  const table = generateTruthTable('P');
  expect(table.columns.map((column) => [column.id, column.kind, column.isFinal])).toEqual([
    ['var:v1:P', 'given', false],
    ['expr:v1:P', 'answer', true],
  ]);
  expect(table.rows.map((row) => Object.values(row.values))).toEqual([
    [true, true],
    [false, false],
  ]);
});

test('negations are distinct intermediate expressions', () => {
  expect(
    generateTruthTable('!!P')
      .columns.filter((column) => column.kind === 'answer')
      .map((column) => column.label),
  ).toEqual(['¬P', '¬¬P']);
});

test.each(['P | !P', 'P & !P'])('evaluates tautology or contradiction %s', (source) => {
  const table = generateTruthTable(source);
  const id = table.columns.find((column) => column.isFinal)!.id;
  expect(table.rows.map((row) => row.values[id])).toEqual(
    source.includes('|') ? [true, true] : [false, false],
  );
});

test('four-variable table has 16 distinct rows, complete cells, and exactly one final column', () => {
  const table = generateTruthTable('(D & B) -> (A | C)');
  expect(table.variables).toEqual(['A', 'B', 'C', 'D']);
  expect(table.rows).toHaveLength(16);
  expect(new Set(table.rows.map((row) => row.id)).size).toBe(16);
  expect(new Set(table.columns.map((column) => column.id)).size).toBe(table.columns.length);
  expect(table.columns.filter((column) => column.isFinal)).toHaveLength(1);
  for (const row of table.rows) {
    expect(Object.keys(row.values)).toEqual(table.columns.map((column) => column.id));
  }
  expect(table.rows[0]!.id).toBe('row:v1:A=T;B=T;C=T;D=T');
  expect(table.rows[15]!.id).toBe('row:v1:A=F;B=F;C=F;D=F');
});

test.each(['P & Q & R & S & T', 'P &', 'p'])(
  'generation enforces parser rules for %j',
  (source) => {
    expect(() => generateTruthTable(source)).toThrow(FormulaParseError);
  },
);

test('generation returns independent data on repeated calls', () => {
  const first = generateTruthTable('P -> Q');
  const second = generateTruthTable('P -> Q');
  expect(first).toEqual(second);
  expect(first.rows).not.toBe(second.rows);
  expect(first.rows[0]!.values).not.toBe(second.rows[0]!.values);
});
