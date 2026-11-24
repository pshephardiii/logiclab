import { useId } from 'react';
import type { TruthTreeChainChoice } from '@logiclab/contracts/truth-tree';
import type { truthTreeChainSelection } from '../helpers/chain-choices';

/** Controlled conjunct/split selection; the parent owns entry validity and confirmation. */
export function TruthTreeChainChoiceField({
  selection,
  onChange,
}: {
  selection: ReturnType<typeof truthTreeChainSelection>;
  onChange: (choice: TruthTreeChainChoice | undefined) => void;
}) {
  const id = useId();
  if (!selection) return null;
  const conjunct = selection.ruleId === 'conjunct_extraction';

  return (
    <div className="truth-tree-chain-choice">
      <label htmlFor={id}>{conjunct ? 'Conjunct to extract' : 'Split between disjuncts'}</label>
      <select
        id={id}
        value={selection.filled ? (selection.selected ?? '') : ''}
        onChange={(event) =>
          onChange(
            event.target.value === ''
              ? undefined
              : selection.choices.find((choice) => choice.value === Number(event.target.value))
                  ?.choice,
          )
        }
      >
        <option value="">Choose {conjunct ? 'conjunct' : 'split'}</option>
        {selection.choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </div>
  );
}
