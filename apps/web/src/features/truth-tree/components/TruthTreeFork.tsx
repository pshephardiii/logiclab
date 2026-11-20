/** Decorative connectors share grid coordinates with the HTML formula controls. */
export function TruthTreeFork({
  row,
  leftColumn,
  rightColumn,
  parentOffset,
}: {
  row: number;
  leftColumn: number;
  rightColumn: number;
  parentOffset: number;
}) {
  return (
    <div
      className="truth-tree-fork"
      style={{ gridRow: row, gridColumn: `${leftColumn} / ${rightColumn}` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
        <line x1={parentOffset} y1="0" x2="0" y2="100" />
        <line x1={parentOffset} y1="0" x2="100" y2="100" />
      </svg>
    </div>
  );
}
