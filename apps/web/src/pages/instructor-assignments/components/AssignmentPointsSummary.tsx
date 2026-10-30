export function AssignmentPointsSummary({
  invalidPoints,
  totalPoints,
}: {
  invalidPoints: boolean;
  totalPoints: number;
}) {
  return (
    <>
      <p className="help">
        Each problem has its own weight. Use whole points from 1 to 1,000. Published allocations are
        locked.
      </p>
      {invalidPoints ? (
        <p role="alert">Enter whole points from 1 to 1,000 for every problem.</p>
      ) : (
        <p>Total available: {totalPoints} points.</p>
      )}
    </>
  );
}
