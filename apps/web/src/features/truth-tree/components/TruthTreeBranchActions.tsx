export function TruthTreeBranchActions({
  number,
  branchId,
  closed,
  disabled,
  activeMode,
  onExpand,
  onClose,
  onReopen,
}: {
  number: number;
  branchId: string;
  closed: boolean;
  disabled: boolean;
  activeMode?: 'expand' | 'close';
  onExpand: () => void;
  onClose: () => void;
  onReopen: () => void;
}) {
  return (
    <div className="truth-tree-branch-actions">
      {closed ? (
        <button
          type="button"
          className="secondary"
          disabled={disabled}
          aria-label={`Reopen branch ${number}`}
          data-tree-branch-action={branchId}
          onClick={onReopen}
        >
          Reopen branch
        </button>
      ) : (
        <>
          <button
            type="button"
            className="secondary"
            disabled={disabled}
            aria-label={`Add step to branch ${number}`}
            aria-expanded={activeMode === 'expand'}
            data-tree-branch-action={branchId}
            onClick={onExpand}
          >
            + Add step
          </button>
          <button
            type="button"
            className="secondary"
            disabled={disabled}
            aria-label={`Close branch ${number}`}
            aria-expanded={activeMode === 'close'}
            onClick={onClose}
          >
            Close
          </button>
        </>
      )}
    </div>
  );
}
