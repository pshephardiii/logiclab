import { ProofDropdown } from '../components/ProofDropdown';

export function DependencyLineActions({
  index,
  count,
  disabled,
  onEdit,
  onMove,
  onInsert,
  onDelete,
  onDischarge,
}: {
  index: number;
  count: number;
  disabled: boolean;
  onEdit: () => void;
  onMove: (delta: -1 | 1) => void;
  onInsert: () => void;
  onDelete: () => void;
  onDischarge?: () => void;
}) {
  return (
    <ProofDropdown
      label={`Actions for line ${index + 1}`}
      trigger={<span aria-hidden="true">⋯</span>}
      disabled={disabled}
    >
      {(close) => (
        <div className="proof-line-menu">
          <button
            type="button"
            onClick={() => {
              close();
              onEdit();
            }}
          >
            Edit line {index + 1}
          </button>
          {onDischarge && (
            <button
              type="button"
              onClick={() => {
                close();
                onDischarge();
              }}
            >
              Discharge assumption {index + 1}
            </button>
          )}
          <button
            type="button"
            disabled={index === 0}
            onClick={() => {
              close();
              onMove(-1);
            }}
          >
            Move line {index + 1} up
          </button>
          <button
            type="button"
            disabled={index === count - 1}
            onClick={() => {
              close();
              onMove(1);
            }}
          >
            Move line {index + 1} down
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              onInsert();
            }}
          >
            Insert before line {index + 1}
          </button>
          <button
            type="button"
            className="delete-action"
            onClick={() => {
              close();
              onDelete();
            }}
          >
            Delete line {index + 1}
          </button>
        </div>
      )}
    </ProofDropdown>
  );
}
