import { PROOF_LIMITS, type DependencyProof, type DependencyProofStep } from '@logiclab/contracts';
import { ProofChoice } from '../components/ProofChoice';
import { DependencyInferenceFields } from './DependencyInferenceFields';

export function DependencyProofLine({
  proof,
  index,
  statement,
  onChange,
  onMove,
  onDelete,
  purpose = 'reference',
}: {
  proof: DependencyProof;
  purpose?: 'reference' | 'student';
  index: number;
  statement: {
    premises: { id: string; formula: string }[];
    rules: { id: string; label: string }[];
  };
  onChange: (step: DependencyProofStep) => void;
  onMove?: (delta: -1 | 1) => void;
  onDelete?: () => void;
}) {
  const step = proof.steps[index]!;

  const sources = proof.steps
    .slice(0, index + 1)
    .flatMap((line, position) =>
      line.kind === 'inference'
        ? []
        : [{ id: line.id, label: `${position + 1}. ${line.formula || '(blank)'}` }],
    );

  const unavailable = step.dependencies.filter((id) => !sources.some((source) => source.id === id));

  return (
    <section
      className="problem-option"
      aria-label={`${purpose === 'reference' ? 'Reference' : 'Proof'} line ${index + 1}`}
    >
      <h4>
        Line {index + 1} — {step.kind}
      </h4>
      <label>
        Formula for line {index + 1}
        <input
          maxLength={PROOF_LIMITS.maxFormulaLength}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={step.formula}
          onChange={(event) => onChange({ ...step, formula: event.target.value })}
        />
      </label>
      {step.kind === 'premise' && (
        <ProofChoice
          label={`Statement premise for line ${index + 1}`}
          value={step.premiseId}
          choices={statement.premises.map((premise, position) => ({
            id: premise.id,
            label: `${position + 1}. ${premise.formula || '(blank)'}`,
          }))}
          onChange={(premiseId) => onChange({ ...step, premiseId })}
        />
      )}
      {step.kind === 'inference' && (
        <DependencyInferenceFields
          step={step}
          index={index}
          steps={proof.steps}
          rules={statement.rules}
          onChange={onChange}
        />
      )}
      <fieldset className="dependency-sources">
        <legend>Dependencies for line {index + 1}</legend>
        <p className="help">
          Select the premise or assumption lines supporting this line. No selection means the empty
          set. Checking verifies your choices; it does not fill them in.
        </p>
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
            {source.label}
          </label>
        ))}
        {unavailable.map((id, position) => (
          <div key={position}>
            <span>Missing or unavailable dependency</span>
            <button
              type="button"
              className="secondary"
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
      </fieldset>
      {onMove && onDelete && (
        <div className="action-row">
          <button
            type="button"
            className="secondary"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            Move line {index + 1} up
          </button>
          <button
            type="button"
            className="secondary"
            disabled={index === proof.steps.length - 1}
            onClick={() => onMove(1)}
          >
            Move line {index + 1} down
          </button>
          <button type="button" className="secondary" onClick={onDelete}>
            Delete line {index + 1}
          </button>
        </div>
      )}
    </section>
  );
}
