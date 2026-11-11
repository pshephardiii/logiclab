import { TreeConnectionFields } from './TreeConnectionFields';
import type { TreeConnection } from './entry';
import type { ComponentProps } from 'react';
import { TreeProofNodeFields } from './TreeProofNodeFields';

type Props = Omit<ComponentProps<typeof TreeProofNodeFields>, 'staged'> & {
  onConfirm: () => void;
  onDiscard: () => void;
  connection?: TreeConnection;
  onConnectionChange: (connection: TreeConnection) => void;
};

/** Confirmation adds local work; it neither checks correctness nor saves to the API. */
export function TreeProofEntry({
  onConfirm,
  onDiscard,
  connection,
  onConnectionChange,
  ...fields
}: Props) {
  return (
    <section
      className="tree-entry"
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
      <TreeProofNodeFields {...fields} staged />
      {connection && (
        <TreeConnectionFields
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
