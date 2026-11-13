/** Presentation only: each editor retains its own selection, stale-snapshot guards and cancellation. */
export function ProofRangeSelectionHelp({
  startLine,
  className,
  onCancel,
}: {
  startLine?: number | '?';
  className: string;
  onCancel: () => void;
}) {
  return startLine !== undefined ? (
    <div className={className}>
      <p role="status">
        Line {startLine} selected. Select the line number at the other end of the range.
      </p>
      <button type="button" className="secondary" onClick={onCancel}>
        Cancel selection
      </button>
    </div>
  ) : (
    <p className="help">To delete several lines, select the first and last line numbers.</p>
  );
}
