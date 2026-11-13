import { NaturalDeductionTreeConnectionFields } from './NaturalDeductionTreeConnectionFields';
import type { NaturalDeductionTreeConnection } from './entry';
import type { ComponentProps } from 'react';
import { NaturalDeductionTreeProofNodeFields } from './NaturalDeductionTreeProofNodeFields';

type Props = Omit<ComponentProps<typeof NaturalDeductionTreeProofNodeFields>, 'staged'> & {
  onConfirm: () => void;
  onDiscard: () => void;
  connection?: NaturalDeductionTreeConnection;
  onConnectionChange: (connection: NaturalDeductionTreeConnection) => void;
};

/** Confirmation adds local work; it neither checks correctness nor saves to the API. */
export function NaturalDeductionTreeProofEntry({
  onConfirm,
  onDiscard,
  connection,
  onConnectionChange,
  ...fields
}: Props) {
  return (
    <section
      className="natural-deduction-tree-entry"
      aria-label="Unconfirmed proof node"
      onKeyDown={(event) => {
        if (
          event.key !== 'Enter' ||
          event.nativeEvent.isComposing ||
          !(event.target instanceof HTMLInputElement) ||
          !event.target.hasAttribute('data-proof-formula')
        )
          return;
        event.preventDefault();
        onConfirm();
      }}
    >
      <NaturalDeductionTreeProofNodeFields {...fields} staged />
      {connection && (
        <NaturalDeductionTreeConnectionFields
          connection={connection}
          proof={fields.proof}
          onChange={onConnectionChange}
        />
      )}
      <div className="action-row">
        <button type="button" onClick={onConfirm}>
          Add node
        </button>
        <button type="button" className="text-button" onClick={onDiscard}>
          Discard entry
        </button>
      </div>
    </section>
  );
}
