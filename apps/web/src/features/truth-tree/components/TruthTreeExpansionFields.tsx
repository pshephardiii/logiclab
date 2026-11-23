import { truthTreeFormulaLabel } from '../helpers/formula-presentation';
import { TRUTH_TREE_LIMITS, type TruthTreeChainChoice } from '@logiclab/contracts/truth-tree';
import { truthTreeRuleCatalog } from '@logiclab/logic-engine/truth-tree';
import { truthTreeChainChoices } from '../helpers/chain-choices';
import { ProofFormulaInput } from '../../proof/components/ProofFormulaInput';
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
  const usesChain =
    version === 2 && (entry.ruleId === 'conjunct_extraction' || entry.ruleId === 'disjunction');
  const choices = truthTreeChainChoices(
    sources.find((source) => source.id === entry.sourceId)?.formula ?? '',
    entry.ruleId,
  );
  const selected =
    entry.chainChoice?.ruleId === 'conjunct_extraction'
      ? entry.chainChoice.memberIndex
      : entry.chainChoice?.splitIndex;
  const choiceFilled =
    !usesChain ||
    choices.some(
      (option) => option.value === selected && option.choice.ruleId === entry.chainChoice?.ruleId,
    );
  const filled = Boolean(
    entry.sourceId &&
    choiceFilled &&
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
      {usesChain && (
        <div className="truth-tree-chain-choice">
          <label htmlFor={`${id}-choice`}>
            {entry.ruleId === 'conjunct_extraction'
              ? 'Conjunct to extract'
              : 'Split between disjuncts'}
          </label>
          <select
            id={`${id}-choice`}
            value={choiceFilled ? (selected ?? '') : ''}
            onChange={(event) =>
              onChange({
                ...entry,
                chainChoice:
                  event.target.value === ''
                    ? undefined
                    : choices.find((choice) => choice.value === Number(event.target.value))?.choice,
              })
            }
          >
            <option value="">
              Choose {entry.ruleId === 'conjunct_extraction' ? 'conjunct' : 'split'}
            </option>
            {choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div
        className={`truth-tree-expansion-results${rule?.branching ? ' truth-tree-expansion-results--split' : ''}`}
      >
        {entry.formulas.map((group, groupIndex) => (
          <fieldset key={groupIndex}>
            <legend>
              {rule?.branching
                ? groupIndex === 0
                  ? 'Left branch'
                  : 'Right branch'
                : 'Continue this branch'}
            </legend>
            {group.map((formula, formulaIndex) => (
              <label key={formulaIndex}>
                Formula {formulaIndex + 1}
                <ProofFormulaInput
                  aria-label={`Formula ${formulaIndex + 1} · Result ${groupIndex + 1}.${formulaIndex + 1}`}
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
      </div>
      <button type="button" disabled={!filled} onClick={onAdd}>
        Add expansion
      </button>
    </section>
  );
}
