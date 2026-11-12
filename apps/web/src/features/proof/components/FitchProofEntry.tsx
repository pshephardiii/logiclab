import { PROOF_LIMITS, type FitchProof, type FitchProofStep } from '@logiclab/contracts';
import type { FitchDerivationContent } from '@logiclab/contracts/derivation';
import { ProofFormulaInput } from './ProofFormulaInput';
import { FitchInferenceFields } from './FitchInferenceFields';
import { FitchPremiseFields } from './FitchPremiseFields';
import { useId, type ReactNode } from 'react';

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
  editing = false,
  premises = [],
  actions,
  lineNumber,
}: {
  proof: FitchProof;
  index: number;
  rules: FitchDerivationContent['rules'];
  blocks: { id: string; label: string; citationLabel?: string }[];
  pending: boolean;
  editing?: boolean;
  actions?: ReactNode;
  lineNumber?: ReactNode;
  premises?: FitchDerivationContent['premises'];
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
      <th
        scope="row"
        className="fitch-line-number"
        aria-label={`${editing ? 'Edit' : 'New'} line ${index + 1}`}
      >
        {lineNumber ?? index + 1}
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
        ) : step.kind === 'premise' ? (
          <FitchPremiseFields
            step={step}
            index={index}
            premises={premises}
            onChange={onChange}
            compact
          />
        ) : (
          <span>{editing ? 'Assumption' : 'Assumption · opens a subproof'}</span>
        )}
      </td>
      <td className="fitch-entry-actions">
        <button type="button" onClick={onConfirm}>
          {editing ? 'Done editing' : 'Add line'}
        </button>
        {pending && !editing && (
          <button type="button" className="text-button" onClick={onDiscard}>
            Discard entry
          </button>
        )}
        {actions}
      </td>
    </tr>
  );
}
