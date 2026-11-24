import { TRUTH_TREE_LIMITS } from '@logiclab/contracts/truth-tree';
import { FormulaInput } from '../../../components/formula/FormulaInput';

/** Edit entered result groups without generating or repairing their formulas. */
export function TruthTreeExpansionResults({
  formulas,
  branching,
  onChange,
}: {
  formulas: string[][];
  branching: boolean;
  onChange: (formulas: string[][]) => void;
}) {
  function changeFormula(groupIndex: number, formulaIndex: number, formula: string) {
    onChange(
      formulas.map((values, i) =>
        i === groupIndex
          ? values.map((value, j) => (j === formulaIndex ? formula : value))
          : values,
      ),
    );
  }

  return (
    <div
      className={`truth-tree-expansion-results${branching ? ' truth-tree-expansion-results--split' : ''}`}
    >
      {formulas.map((group, groupIndex) => (
        <fieldset key={groupIndex}>
          <legend>
            {branching
              ? groupIndex === 0
                ? 'Left branch'
                : 'Right branch'
              : 'Continue this branch'}
          </legend>
          {group.map((formula, formulaIndex) => (
            <label key={formulaIndex}>
              Formula {formulaIndex + 1}
              <FormulaInput
                aria-label={`Formula ${formulaIndex + 1} · Result ${groupIndex + 1}.${formulaIndex + 1}`}
                maxLength={TRUTH_TREE_LIMITS.maxFormulaLength}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={formula}
                onValueChange={(formula) => changeFormula(groupIndex, formulaIndex, formula)}
              />
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
