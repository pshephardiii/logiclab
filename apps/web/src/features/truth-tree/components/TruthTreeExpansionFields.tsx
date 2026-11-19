import { TRUTH_TREE_LIMITS } from '@logiclab/contracts/truth-tree';
import { TRUTH_TREE_RULE_CATALOG } from '@logiclab/logic-engine/truth-tree';
import { ProofFormulaInput } from '../../proof/components/ProofFormulaInput';
import { useId } from 'react';

export type TreeExpansionEntry = { sourceId: string; ruleId: string; formulas: string[][] };
export const emptyTreeExpansion = (): TreeExpansionEntry => ({
  sourceId: '',
  ruleId: '',
  formulas: [],
});

export function TruthTreeExpansionFields({
  entry,
  onChange,
  sources,
  onAdd,
}: {
  entry: TreeExpansionEntry;
  onChange: (entry: TreeExpansionEntry) => void;
  sources: { id: string; number: number; formula: string }[];
  onAdd: () => void;
}) {
  const id = useId();
  const rule = TRUTH_TREE_RULE_CATALOG.find((rule) => rule.id === entry.ruleId);
  const filled = Boolean(
    entry.sourceId &&
    rule &&
    entry.formulas.length === rule.resultFormulaCounts.length &&
    entry.formulas.every(
      (group, index) =>
        group.length === rule.resultFormulaCounts[index] &&
        group.every((formula) => formula.trim()),
    ),
  );
  return (
    <section aria-label="New expansion">
      <label htmlFor={`${id}-source`}>Source formula</label>
      <select
        id={`${id}-source`}
        value={entry.sourceId}
        onChange={(event) => onChange({ ...entry, sourceId: event.target.value })}
      >
        <option value="">Choose source</option>
        {sources.map((item) => (
          <option key={item.id} value={item.id}>
            {item.number}. {item.formula || '(blank)'}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-rule`}>Decomposition rule</label>
      <select
        id={`${id}-rule`}
        value={entry.ruleId}
        disabled={entry.formulas.some((group) => group.some(Boolean))}
        onChange={(event) => {
          const rule = TRUTH_TREE_RULE_CATALOG.find((rule) => rule.id === event.target.value);
          onChange({
            ...entry,
            ruleId: event.target.value,
            formulas: rule
              ? rule.resultFormulaCounts.map((count) => Array.from({ length: count }, () => ''))
              : [],
          });
        }}
      >
        <option value="">Choose rule</option>
        {TRUTH_TREE_RULE_CATALOG.map((rule) => (
          <option key={rule.id} value={rule.id}>
            {rule.label}
          </option>
        ))}
      </select>
      {entry.formulas.map((group, groupIndex) => (
        <fieldset key={groupIndex}>
          <legend>{rule?.branching ? `New branch ${groupIndex + 1}` : 'Same branch'}</legend>
          {group.map((formula, formulaIndex) => (
            <label key={formulaIndex}>
              Result {groupIndex + 1}.{formulaIndex + 1}
              <ProofFormulaInput
                maxLength={TRUTH_TREE_LIMITS.maxFormulaLength}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={formula}
                onValueChange={(formula) =>
                  onChange({
                    ...entry,
                    formulas: entry.formulas.map((values, i) =>
                      i === groupIndex
                        ? values.map((value, j) => (j === formulaIndex ? formula : value))
                        : values,
                    ),
                  })
                }
              />
            </label>
          ))}
        </fieldset>
      ))}
      <button type="button" disabled={!filled} onClick={onAdd}>
        Add expansion
      </button>
    </section>
  );
}
