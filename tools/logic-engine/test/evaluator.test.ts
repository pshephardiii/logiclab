import { evaluateFormula, FormulaEvaluationError, parseFormula } from '../src';
import type { VariableAssignment } from '../src';

test.each([
  [true, true, true, true, true],
  [true, false, false, true, false],
  [false, true, false, true, true],
  [false, false, false, false, true],
])('P=%s Q=%s: conjunction=%s disjunction=%s implication=%s', (P, Q, and, or, implies) => {
  expect(evaluateFormula(parseFormula('P & Q'), { P, Q })).toBe(and);
  expect(evaluateFormula(parseFormula('P | Q'), { P, Q })).toBe(or);
  expect(evaluateFormula(parseFormula('P -> Q'), { P, Q })).toBe(implies);
});

test.each([true, false])('evaluates variable and negation for P=%s', P => {
  expect(evaluateFormula(parseFormula('P'), { P })).toBe(P);
  expect(evaluateFormula(parseFormula('!P'), { P })).toBe(!P);
  expect(evaluateFormula(parseFormula('!!P'), { P })).toBe(P);
});

test('evaluates nested formulas with repeated variables', () => {
  expect(evaluateFormula(parseFormula('!(P & Q) -> (P | R)'), { P: false, Q: true, R: false })).toBe(false);
});

test('evaluates implication according to parsed associativity', () => {
  const assignment = { P: false, Q: true, R: false };
  expect(evaluateFormula(parseFormula('P -> Q -> R'), assignment)).toBe(true);
  expect(evaluateFormula(parseFormula('(P -> Q) -> R'), assignment)).toBe(false);
});

test.each([
  ['P & Q', false], ['P | Q', true], ['P -> Q', false],
])('does not hide a missing variable behind short-circuiting in %s', (source, P) => {
  expect(() => evaluateFormula(parseFormula(source), { P })).toThrow(FormulaEvaluationError);
  expect(() => evaluateFormula(parseFormula(source), { P })).toThrow(
    expect.objectContaining({ code: 'MISSING_VARIABLE', variable: 'Q' }),
  );
});

test('rejects inherited variable values', () => {
  const assignment = Object.create({ P: true }) as VariableAssignment;
  expect(() => evaluateFormula(parseFormula('P'), assignment)).toThrow(
    expect.objectContaining({ code: 'MISSING_VARIABLE', variable: 'P' }),
  );
});

test.each([undefined, null, 'F', 0, 1])('rejects non-boolean value %j at runtime', value => {
  const assignment = { P: value } as unknown as VariableAssignment;
  expect(() => evaluateFormula(parseFormula('P'), assignment)).toThrow(
    expect.objectContaining({ code: 'INVALID_VARIABLE_VALUE', variable: 'P' }),
  );
});

test('does not change the AST or assignment', () => {
  const formula = Object.freeze(parseFormula('!P'));
  const assignment = Object.freeze({ P: false, Q: true });
  expect(evaluateFormula(formula, assignment)).toBe(true);
  expect(assignment).toEqual({ P: false, Q: true });
});
