import type { ReactNode } from 'react';

/** One controlled entry is attached to its chosen path; opening it never changes the tree. */
export function TruthTreeBranchEntry({
  number,
  mode,
  disabled,
  error,
  onDiscard,
  children,
}: {
  number: number;
  mode: 'expand' | 'close';
  disabled: boolean;
  error: string | null;
  onDiscard: () => void;
  children: ReactNode;
}) {
  return (
    <fieldset
      className="truth-tree-entry-fields"
      disabled={disabled}
      aria-label={`${mode === 'expand' ? 'Add step to' : 'Close'} branch ${number}`}
    >
      <legend>
        {mode === 'expand' ? 'Add step' : 'Close branch'} · Branch {number}
      </legend>
      {children}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="button" className="text-button" disabled={disabled} onClick={onDiscard}>
        Discard entry
      </button>
    </fieldset>
  );
}
