import type { DerivationContent } from '@logiclab/contracts/derivation';
import type { FitchProof, ProofStep } from '@logiclab/contracts';
import { PROOF_LIMITS } from '@logiclab/contracts';
import { FitchPremiseFields } from './FitchPremiseFields';
import { FitchInferenceFields } from './FitchInferenceFields';

type Props = {
  statement: Pick<DerivationContent, 'premises' | 'rules'>;
  purpose: 'reference' | 'student';
  proof: FitchProof;
  index: number;
  blocks: { id: string; label: string }[];
  onChange: (step: ProofStep) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
};

export function FitchProofLine({
  statement,
  purpose,
  proof,
  index,
  blocks,
  onChange,
  onMove,
  onDelete,
}: Props) {
  const step = proof.steps[index]!;

  return (
    <section
      className="problem-option"
      aria-label={`${purpose === 'reference' ? 'Reference' : 'Proof'} line ${index + 1}`}
    >
      <h4>
        Line {index + 1}
        {step.kind === 'assumption' ? ' — assumption' : ''}
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
      <p>
        Kind:{' '}
        {step.kind === 'inference'
          ? 'Inference'
          : step.kind === 'premise'
            ? 'Premise'
            : 'Assumption'}
      </p>
      {step.kind === 'premise' ? (
        <FitchPremiseFields
          step={step}
          index={index}
          premises={statement.premises}
          onChange={onChange}
        />
      ) : step.kind === 'inference' ? (
        <FitchInferenceFields
          step={step}
          index={index}
          steps={proof.steps}
          rules={statement.rules}
          blocks={blocks}
          onChange={onChange}
        />
      ) : (
        <p className="help">
          Opening assumption of{' '}
          {blocks.find((block) => block.id === step.blockId)?.label ?? 'an unavailable subproof'}.
          Use the block controls to set its parent and endpoint.
        </p>
      )}
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
        <button
          type="button"
          className="secondary"
          disabled={step.kind === 'assumption'}
          onClick={onDelete}
        >
          Delete line {index + 1}
        </button>
      </div>
    </section>
  );
}
