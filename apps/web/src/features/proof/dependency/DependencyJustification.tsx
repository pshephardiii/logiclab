import type { DependencyProofStep } from '@logiclab/contracts';

export function DependencyJustification({
  step,
  labels,
  line,
}: {
  step: DependencyProofStep;
  labels: ReadonlyMap<string, string>;
  line: (id: string | null) => number | string;
}) {
  return (
    <>
      {step.kind === 'inference' ? (
        <>
          {step.ruleId ? (labels.get(step.ruleId) ?? 'Unavailable rule') : 'No rule selected'}
          {step.lineReferences.length > 0 && ` · ${step.lineReferences.map(line).join(', ')}`}
          {step.discharges.length > 0 && (
            <>
              {' '}
              · discharge{' '}
              {step.discharges
                .map((pair) => `${line(pair.assumptionId)}–${line(pair.conclusionId)}`)
                .join(', ')}
            </>
          )}
        </>
      ) : step.kind === 'premise' ? (
        'Premise'
      ) : (
        'Assumption'
      )}
    </>
  );
}
