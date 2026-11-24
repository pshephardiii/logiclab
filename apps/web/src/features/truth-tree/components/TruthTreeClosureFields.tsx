import { useId } from 'react';
import type { TruthTreeClosure } from '@logiclab/contracts/truth-tree';
import { truthTreeFormulaLabel } from '../helpers/formula-presentation';

export function TruthTreeClosureFields({
  disabled,
  closureKind,
  first,
  second,
  sources,
  onKindChange,
  onFirstChange,
  onSecondChange,
  onClose,
  version = 1,
}: {
  disabled: boolean;
  closureKind: TruthTreeClosure['kind'];
  first: string;
  second: string;
  sources: { id: string; number: number; formula: string }[];
  onKindChange: (kind: TruthTreeClosure['kind']) => void;
  onFirstChange: (id: string) => void;
  onSecondChange: (id: string) => void;
  onClose: () => void;
  version?: 1 | 2;
}) {
  const id = useId();

  return (
    <fieldset disabled={disabled} className="truth-tree-closure-fields">
      <legend>Closure</legend>
      <div>
        <label htmlFor={`${id}-closure`}>Closure type</label>
        <select
          id={`${id}-closure`}
          value={closureKind}
          onChange={(event) => onKindChange(event.target.value as TruthTreeClosure['kind'])}
        >
          <option value="complement">Contradictory pair</option>
          <option value="falsity">Contradiction symbol</option>
        </select>
      </div>
      <div className="truth-tree-entry-selects">
        {[0, ...(closureKind === 'complement' ? [1] : [])].map((index) => (
          <div key={index}>
            <label htmlFor={`${id}-witness-${index}`}>Witness {index + 1}</label>
            <select
              id={`${id}-witness-${index}`}
              value={index === 0 ? first : second}
              onChange={(event) =>
                index === 0 ? onFirstChange(event.target.value) : onSecondChange(event.target.value)
              }
            >
              <option value="">Choose formula</option>
              {sources.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.number}. {truthTreeFormulaLabel(item.formula, version)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={!first || (closureKind === 'complement' && (!second || first === second))}
        onClick={onClose}
      >
        Close branch
      </button>
    </fieldset>
  );
}
