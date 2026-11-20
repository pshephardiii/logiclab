import { useId } from 'react';
import { TruthTreeVerdict as Verdict } from '@logiclab/contracts/truth-tree-work';

/** Student interpretation is entered independently; never prefill it from checker evidence. */
export function TruthTreeVerdict({
  value,
  readOnly = false,
  disabled = false,
  onChange,
}: {
  value: Verdict | null | undefined;
  readOnly?: boolean;
  disabled?: boolean;
  onChange?: (value: Verdict | null) => void;
}) {
  const id = useId();
  if (readOnly)
    return (
      <p>
        Your validity verdict:{' '}
        <strong>{value ? (value === Verdict.Valid ? 'Valid' : 'Invalid') : 'Not answered'}</strong>
      </p>
    );

  return (
    <fieldset className="truth-tree-verdict" disabled={disabled}>
      <legend>Is the argument valid or invalid?</legend>
      <div className="truth-tree-verdict-options">
        <label>
          <input
            type="radio"
            name={id}
            checked={value === Verdict.Valid}
            onChange={() => onChange?.(Verdict.Valid)}
          />
          Valid
        </label>
        <label>
          <input
            type="radio"
            name={id}
            checked={value === Verdict.Invalid}
            onChange={() => onChange?.(Verdict.Invalid)}
          />
          Invalid
        </label>
        <button
          type="button"
          className="text-button"
          disabled={!value}
          onClick={() => onChange?.(null)}
        >
          Clear verdict
        </button>
      </div>
    </fieldset>
  );
}
