import { ProofSubmenu } from './ProofSubmenu';
import { ProofDropdown } from './ProofDropdown';

/** Line operations stay separate from rule application and explicit subproof endpoints. */
export function FitchLineActions({
  index,
  count,
  disabled,
  onEdit,
  onMove,
  onInsert,
  onDelete,
  onSettings,
  onDeleteSubproof,
  onCloseSubproof,
  onReopenSubproof,
  onContinueSubproof,
  onRange,
}: {
  index: number;
  count: number;
  disabled: boolean;
  onEdit: () => void;
  onMove?: (delta: -1 | 1) => void;
  onInsert?: () => void;
  onDelete?: () => void;
  onSettings?: () => void;
  onDeleteSubproof?: () => void;
  onCloseSubproof?: () => void;
  onReopenSubproof?: () => void;
  onContinueSubproof?: () => void;
  onRange?: () => void;
}) {
  return (
    <ProofDropdown
      label={`Actions for line ${index + 1}`}
      trigger={<span aria-hidden="true">⋯</span>}
      disabled={disabled}
    >
      {(close, open) => {
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
            {action(`Edit line ${index + 1}`, onEdit)}
            {onMove && (
              <ProofSubmenu label="Move line" parentOpen={open}>
                {action(`Move line ${index + 1} up`, () => onMove(-1), index === 0)}
                {action(`Move line ${index + 1} down`, () => onMove(1), index === count - 1)}
              </ProofSubmenu>
            )}
            {onInsert && action(`Insert before line ${index + 1}`, onInsert)}
            {(onCloseSubproof || onSettings || onContinueSubproof || onReopenSubproof) && (
              <ProofSubmenu label="Subproof" parentOpen={open}>
                {onCloseSubproof && action(`Close subproof at line ${index + 1}`, onCloseSubproof)}
                {onSettings && action(`Subproof settings for line ${index + 1}`, onSettings)}
                {onContinueSubproof &&
                  action(`Continue subproof at line ${index + 1}`, onContinueSubproof)}
                {onReopenSubproof &&
                  action(`Reopen subproof at line ${index + 1}`, onReopenSubproof)}
              </ProofSubmenu>
            )}
            {(onRange || onDelete || onDeleteSubproof) && (
              <ProofSubmenu label="Delete" parentOpen={open}>
                {onDelete && action(`Delete line ${index + 1}`, onDelete, false, true)}
                {onRange && action(`Delete a range starting at line ${index + 1}`, onRange)}
                {onDeleteSubproof &&
                  action(`Delete subproof at line ${index + 1}`, onDeleteSubproof, false, true)}
              </ProofSubmenu>
            )}
          </div>
        );
      }}
    </ProofDropdown>
  );
}
