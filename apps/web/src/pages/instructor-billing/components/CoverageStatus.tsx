import type { ClassBillingResponse } from '@logiclab/contracts';

/** Funding coverage is separate from purchase status; another grant may still cover this class. */
export function CoverageStatus({ coverage }: { coverage: ClassBillingResponse['coverage'] }) {
  // Re-evaluate a loaded end time at render; the server remains authoritative at publication.
  const active =
    coverage.active && coverage.endsAt !== null && new Date(coverage.endsAt).getTime() > Date.now();
  return (
    <section className="panel" aria-label="Class coverage">
      <h2>Class coverage</h2>
      <p>
        {active
          ? `Assignment publishing is covered until ${new Date(coverage.endsAt!).toLocaleString()}.`
          : 'No active publishing coverage. New assignment publication requires a class purchase.'}
      </p>
      <p>
        Existing published assignments, student work, and instructor review remain available after
        expiration or refund. Refresh to check current coverage; publishing always checks the
        server.
      </p>
    </section>
  );
}
