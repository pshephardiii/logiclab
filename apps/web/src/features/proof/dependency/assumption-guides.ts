import type { DependencyProofStep } from '@logiclab/contracts';

type Guide = {
  id: string;
  line: number;
  start: number;
  end: number;
  lane: number;
  closed: boolean;
};

/** Presentation of entered assumption/discharge references, not inferred Fitch scopes or validity. */
export function dependencyAssumptionGuides(steps: DependencyProofStep[]) {
  const positions = new Map(steps.map((step, index) => [step.id, index]));
  const guides: Guide[] = [];

  for (const [start, step] of steps.entries()) {
    if (step.kind !== 'assumption') continue;

    const endings: number[] = [];
    let lastUse = start;

    for (let index = start; index < steps.length; index++) {
      const later = steps[index]!;

      if (later.dependencies.includes(step.id)) lastUse = index;

      if (later.kind !== 'inference') continue;

      for (const pair of later.discharges) {
        const end = pair.conclusionId ? positions.get(pair.conclusionId) : undefined;

        if (pair.assumptionId === step.id && end !== undefined && end >= start && end < index)
          endings.push(end);
      }
    }

    // Unclosed assumptions continue to the last entered line. Reuse after discharge remains
    // visible: dependency proofs allow explicit reuse and do not acquire a hidden scope lock.
    const end = endings.length ? Math.max(lastUse, ...endings) : steps.length - 1;
    let lane = 0;

    while (guides.some((guide) => guide.lane === lane && guide.end >= start)) lane++;

    guides.push({ id: step.id, line: start + 1, start, end, lane, closed: endings.includes(end) });
  }

  return { guides, lanes: guides.reduce((max, guide) => Math.max(max, guide.lane + 1), 0) };
}
