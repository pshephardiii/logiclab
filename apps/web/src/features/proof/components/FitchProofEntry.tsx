import { PROOF_LIMITS, type FitchProof, type FitchProofStep } from '@logiclab/contracts';
import type { FitchDerivationContent } from '@logiclab/contracts/derivation';
import { ProofFormulaInput } from './ProofFormulaInput';
import { FitchInferenceFields } from './FitchInferenceFields';
import { useId } from 'react';

/** Confirm an editing action, not correctness or saving. Incomplete work may be added explicitly. */
export function FitchProofEntry({
  proof,
  index,
  rules,
  blocks,
  pending,
  onChange,
  onConfirm,
  onDiscard,
}: {
  proof: FitchProof;
  index: number;
  rules: FitchDerivationContent['rules'];
  blocks: { id: string; label: string }[];
  pending: boolean;
  onChange: (step: FitchProofStep) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const step = proof.steps[index]!;
  const hint = useId();

  return (
    <tr
      className="fitch-entry-row"
      onKeyDown={(event) => {
        if (
          event.key !== 'Enter' ||
          event.nativeEvent.isComposing ||
          !(event.target instanceof HTMLInputElement) ||
          !event.target.hasAttribute('data-proof-formula')
        )
          return;
        event.preventDefault();
        onConfirm();
      }}
    >
      <th scope="row" className="fitch-line-number" aria-label={`New line ${index + 1}`}>
        {index + 1}
      </th>
      <td className="fitch-line-formula">
        <ProofFormulaInput
          data-proof-formula="true"
          aria-label={`Formula for line ${index + 1}`}
          aria-describedby={hint}
          placeholder={step.kind === 'assumption' ? 'Assumption formula' : 'Formula'}
          maxLength={PROOF_LIMITS.maxFormulaLength}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={step.formula}
          onValueChange={(formula) => onChange({ ...step, formula })}
        />
        <span className="proof-control-label" id={hint}>
          Contradiction: type _|_ for ⊥.
        </span>
      </td>
      <td className="fitch-line-justification">
        {step.kind === 'inference' ? (
          <div className="fitch-entry-reasons">
            <FitchInferenceFields
              compact
              step={step}
              index={index}
              steps={proof.steps}
              rules={rules}
              blocks={blocks}
              onChange={onChange}
            />
          </div>
        ) : (
          <span>Assumption · opens a subproof</span>
        )}
      </td>
      <td className="fitch-entry-actions">
        <button type="button" onClick={onConfirm}>
          Add line
        </button>
        {pending && (
          <button type="button" className="text-button" onClick={onDiscard}>
            Discard entry
          </button>
        )}
      </td>
    </tr>
  );
}
