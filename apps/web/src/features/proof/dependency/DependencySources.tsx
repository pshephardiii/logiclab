import { PROOF_LIMITS, type DependencyProofStep } from '@logiclab/contracts';
import { ProofDropdown } from '../components/ProofDropdown';

export function DependencySources({
  steps,
  index,
  onChange,
}: {
  steps: DependencyProofStep[];
  index: number;
  onChange: (step: DependencyProofStep) => void;
}) {
  const step = steps[index]!;
  const positions = new Map(steps.map((line, position) => [line.id, position + 1]));
  const sources = steps.slice(0, index + 1).filter((line) => line.kind !== 'inference');
  const missing = step.dependencies.filter((id) => !sources.some((source) => source.id === id));
  const value = step.dependencies.length
    ? `{${step.dependencies.map((id) => positions.get(id) ?? '?').join(', ')}}`
    : '∅';

  return (
    <ProofDropdown
      label={`Dependencies for line ${index + 1}`}
      trigger={
        <>
          {value} <span aria-hidden="true">⌄</span>
        </>
      }
    >
      {() => (
        <>
          {!sources.length && !missing.length && <p>No premise or assumption lines.</p>}
          {sources.map((source) => (
            <label className="dependency-source" key={source.id}>
              <input
                type="checkbox"
                checked={step.dependencies.includes(source.id)}
                disabled={
                  !step.dependencies.includes(source.id) &&
                  step.dependencies.length >= PROOF_LIMITS.maxSteps
                }
                onChange={(event) =>
                  onChange({
                    ...step,
                    dependencies: event.target.checked
                      ? [...step.dependencies, source.id]
                      : step.dependencies.filter((id) => id !== source.id),
                  })
                }
              />
              {positions.get(source.id)}. {source.formula || '(blank)'}
            </label>
          ))}
          {missing.map((id, position) => (
            <div key={`${id}-${position}`}>
              <p>Missing or unavailable dependency</p>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  onChange({
                    ...step,
                    dependencies: step.dependencies.filter((value) => value !== id),
                  })
                }
              >
                Remove unavailable dependency {position + 1} from line {index + 1}
              </button>
            </div>
          ))}
        </>
      )}
    </ProofDropdown>
  );
}
