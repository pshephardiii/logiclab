import type { FitchProof } from '@logiclab/contracts';
import type { fitchDisplayScope } from '../helpers/fitch-display';

/** Format entered rule references and scope warnings, including unresolved targets. */
export function FitchJustification({
  step,
  labels,
  blocks,
  line,
  scope,
}: {
  step: FitchProof['steps'][number];
  labels: ReadonlyMap<string, string>;
  blocks: ReadonlyMap<string, FitchProof['blocks'][number]>;
  line: (id: string | null) => number | string;
  scope: ReturnType<typeof fitchDisplayScope>;
}) {
  return (
    <>
      {step.kind === 'inference' ? (
        <>
          {step.ruleId ? (labels.get(step.ruleId) ?? 'Unavailable rule') : 'No rule selected'}
          {step.lineReferences.length > 0 && ` · ${step.lineReferences.map(line).join(', ')}`}
          {step.subproofReferences.length > 0 &&
            ` · subproof ${step.subproofReferences
              .map((id) => {
                const block = blocks.get(id);
                return block
                  ? block.endId
                    ? `${line(block.assumptionId)}–${line(block.endId)}`
                    : `starting at line ${line(block.assumptionId)} (not closed)`
                  : 'Missing subproof';
              })
              .join(', ')}`}
        </>
      ) : step.kind === 'premise' ? (
        'Premise'
      ) : (
        'Assumption'
      )}
      {scope.path.length > 0 && (
        <span className="proof-control-label">
          Inside subproof {scope.path.map((block) => line(block.assumptionId)).join(', ')}
        </span>
      )}
      {scope.warning && <span className="fitch-scope-warning">{scope.warning}</span>}
    </>
  );
}
