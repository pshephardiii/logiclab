import { useId } from 'react';
import type { TruthTreeClosure } from '@logiclab/contracts/truth-tree';

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
}) {
  const id = useId();

  return (
    <fieldset disabled={disabled}>
      <legend>Close branch</legend>
      <label htmlFor={`${id}-closure`}>Closure type</label>
      <select
        id={`${id}-closure`}
        value={closureKind}
        onChange={(event) => onKindChange(event.target.value as TruthTreeClosure['kind'])}
      >
        <option value="complement">Contradictory pair</option>
        <option value="falsity">Contradiction symbol</option>
      </select>
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
                {item.number}. {item.formula || '(blank)'}
              </option>
            ))}
          </select>
        </div>
      ))}
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
