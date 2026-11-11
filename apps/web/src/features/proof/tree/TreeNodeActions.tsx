import { ProofDropdown } from '../components/ProofDropdown';
import type { TreeProofNode } from '@logiclab/contracts';

export function TreeNodeActions({
  index,
  disabled,
  root,
  slots,
  onEdit,
  onRoot,
  onDelete,
  onConnect,
}: {
  index: number;
  disabled: boolean;
  root: boolean;
  slots: { support: number; branch: number };
  onEdit: () => void;
  onRoot: () => void;
  onDelete: () => void;
  onConnect: (kind: TreeProofNode['kind'], connection: 'support' | 'branch') => void;
}) {
  return (
    <ProofDropdown
      label={`Actions for node ${index + 1}`}
      trigger={<span aria-hidden="true">⋯</span>}
      disabled={disabled}
    >
      {(close) => {
        function action(label: string, run: () => void, unavailable = false, danger = false) {
          return (
            <button
              type="button"
              disabled={unavailable}
              className={danger ? 'delete-action' : undefined}
              onClick={() => {
                close();
                run();
              }}
            >
              {label}
            </button>
          );
        }

        return (
          <div className="proof-line-menu">
            {action(`Edit node ${index + 1} fields`, onEdit)}
            {slots.support >= 0 &&
              (['premise', 'assumption', 'inference'] as const).map((kind) => (
                <div key={kind}>
                  {action(`New supporting ${kind} for node ${index + 1}`, () =>
                    onConnect(kind, 'support'),
                  )}
                </div>
              ))}
            {slots.branch >= 0 && (
              <>
                {action(`New branch inference for node ${index + 1}`, () =>
                  onConnect('inference', 'branch'),
                )}
                {action(`New branch assumption for node ${index + 1}`, () =>
                  onConnect('assumption', 'branch'),
                )}
              </>
            )}
            {action(`Use node ${index + 1} as conclusion root`, onRoot, root)}
            {action(`Delete node ${index + 1}`, onDelete, false, true)}
          </div>
        );
      }}
    </ProofDropdown>
  );
}
