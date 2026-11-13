import type { FitchProof } from '@logiclab/contracts';
import { proofNotation } from '../helpers/proof-notation';

/** Render entered block boundaries without validating or repairing their scope. */
export function FitchScopedFormula({
  step,
  path,
}: {
  step: FitchProof['steps'][number];
  path: readonly FitchProof['blocks'][number][];
}) {
  return (
    <span className="fitch-scoped-formula" style={{ paddingLeft: `${path.length * 0.7}rem` }}>
      <span className="fitch-scope-guides" aria-hidden="true">
        {path.map((block, depth) => (
          <span
            key={block.id}
            className={`fitch-scope-guide${block.assumptionId === step.id ? ' scope-start' : ''}${block.endId === step.id ? ' scope-end' : ''}`}
            style={{ left: `${depth * 0.7}rem` }}
          />
        ))}
      </span>
      <code>{proofNotation(step.formula) || '(blank)'}</code>
    </span>
  );
}
