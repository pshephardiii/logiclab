import { truthTreeFormulaLabel } from '../helpers/formula-presentation';
import type { TruthTreeChainChoice } from '@logiclab/contracts/truth-tree';
import { truthTreeRuleCatalog } from '@logiclab/logic-engine/truth-tree';
import { truthTreeChainSelection } from '../helpers/chain-choices';
import { TruthTreeChainChoiceField } from './TruthTreeChainChoiceField';
import { TruthTreeExpansionResults } from './TruthTreeExpansionResults';
import { useId } from 'react';

export type TreeExpansionEntry = {
  sourceId: string;
  ruleId: string;
  formulas: string[][];
  chainChoice?: TruthTreeChainChoice;
};
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
  version = 1,
}: {
  entry: TreeExpansionEntry;
  onChange: (entry: TreeExpansionEntry) => void;
  sources: { id: string; number: number; formula: string }[];
  onAdd: () => void;
  version?: 1 | 2;
}) {
  const id = useId();
  const catalog = truthTreeRuleCatalog(version);
  const rule = catalog.find((rule) => rule.id === entry.ruleId);
  const selection = truthTreeChainSelection({
    version,
    ruleId: entry.ruleId,
    source: sources.find((source) => source.id === entry.sourceId)?.formula ?? '',
    choice: entry.chainChoice,
  });
  const filled = Boolean(
    entry.sourceId &&
    (!selection || selection.filled) &&
    rule &&
    entry.formulas.length === rule.resultFormulaCounts.length &&
    entry.formulas.every(
      (group, index) =>
        group.length === rule.resultFormulaCounts[index] &&
        group.every((formula) => formula.trim()),
    ),
  );
  return (
    <section aria-label="New expansion" className="truth-tree-expansion-fields">
      <div className="truth-tree-entry-selects">
        <div>
          <label htmlFor={`${id}-source`}>Source formula</label>
          <select
            id={`${id}-source`}
            value={entry.sourceId}
            onChange={(event) =>
              onChange({ ...entry, sourceId: event.target.value, chainChoice: undefined })
            }
          >
            <option value="">Choose source</option>
            {sources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.number}. {truthTreeFormulaLabel(item.formula, version)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-rule`}>Rule</label>
          <select
            id={`${id}-rule`}
            aria-label="Decomposition rule"
            value={entry.ruleId}
            disabled={entry.formulas.some((group) => group.some(Boolean))}
            onChange={(event) => {
              const rule = catalog.find((rule) => rule.id === event.target.value);
              onChange({
                ...entry,
                ruleId: event.target.value,
                chainChoice: undefined,
                formulas: rule
                  ? rule.resultFormulaCounts.map((count) => Array.from({ length: count }, () => ''))
                  : [],
              });
            }}
          >
            <option value="">Choose rule</option>
            {catalog.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <TruthTreeChainChoiceField
        selection={selection}
        onChange={(chainChoice) => onChange({ ...entry, chainChoice })}
      />
      <TruthTreeExpansionResults
        formulas={entry.formulas}
        branching={Boolean(rule?.branching)}
        onChange={(formulas) => onChange({ ...entry, formulas })}
      />
      <button type="button" disabled={!filled} onClick={onAdd}>
        Add expansion
      </button>
    </section>
  );
}
