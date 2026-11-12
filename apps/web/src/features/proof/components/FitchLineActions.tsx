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
}) {
  return (
    <ProofDropdown
      label={`Actions for line ${index + 1}`}
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
            {action(`Edit line ${index + 1}`, onEdit)}
            {onMove && action(`Move line ${index + 1} up`, () => onMove(-1), index === 0)}
            {onMove && action(`Move line ${index + 1} down`, () => onMove(1), index === count - 1)}
            {onInsert && action(`Insert before line ${index + 1}`, onInsert)}
            {onCloseSubproof && action(`Close subproof at line ${index + 1}`, onCloseSubproof)}
            {onSettings && action(`Subproof settings for line ${index + 1}`, onSettings)}
            {onContinueSubproof &&
              action(`Continue subproof at line ${index + 1}`, onContinueSubproof)}
            {onReopenSubproof && action(`Reopen subproof at line ${index + 1}`, onReopenSubproof)}
            {onDelete && action(`Delete line ${index + 1}`, onDelete, false, true)}
            {onDeleteSubproof &&
              action(`Delete subproof at line ${index + 1}`, onDeleteSubproof, false, true)}
          </div>
        );
      }}
    </ProofDropdown>
  );
}
