import { decomposeTruthTreeFormula, parseTruthTreeFormula } from '../../src/truth-tree';
import { requireExplicitGrouping } from '../../src/parser/grouping';
import { parseTruthTreeFormulaWithSyntax } from '../../src/truth-tree/parse-formula';
import { truthTreeSourceDecomposition } from '../../src/truth-tree/source-decomposition';
import { truthTreeBudget } from '../../src/truth-tree/structure-context';

test.each([
  '!!((P v Q) v R)',
  '((P v Q) v R) & S',
  '!(((P v Q) v R) & S)',
  '(P & Q) v R',
  '!((P & Q) v R)',
  '((P v Q) v R) -> S',
  '!(((P v Q) v R) -> S)',
  '((P v Q) v R) <-> S',
  '!(((P v Q) v R) <-> S)',
])(
  'source-aware binary rules preserve their established meaning and parseable boundaries: %s',
  (source) => {
    const expected = decomposeTruthTreeFormula(parseTruthTreeFormula(source));
    const actual = truthTreeSourceDecomposition(source, truthTreeBudget());
    if (expected.kind !== 'expansion' || !actual) throw new Error('fixture');
    expect(actual.ruleId).toBe(expected.ruleId);
    expect(
      actual.branches.map((branch) =>
        branch.map(
          (text) => requireExplicitGrouping(parseTruthTreeFormulaWithSyntax(text)).formula,
        ),
      ),
    ).toEqual(expected.branches);
    if (source.includes('(P v Q)'))
      expect(actual.branches.flat().some((text) => text.includes('(P v Q)'))).toBe(true);
  },
);
