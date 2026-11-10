import { ProofFormulaInput } from '../components/ProofFormulaInput';
import { useId, useRef } from 'react';
import { PROOF_LIMITS, type DependencyProof, type DependencyProofStep } from '@logiclab/contracts';
import { ProofChoice } from '../components/ProofChoice';
import { DependencyInferenceFields } from './DependencyInferenceFields';
import { DependencySources } from './DependencySources';

type Inference = Extract<DependencyProofStep, { kind: 'inference' }>;
type Assumption = Extract<DependencyProofStep, { kind: 'assumption' }>;

/** One compact bottom row, shared by new entries and editing an existing line. */
export function DependencyProofLine({
  proof,
  index,
  statement,
  onChange,
  allowKindChange,
  onConfirm,
  onDiscard,
  pending,
}: {
  proof: DependencyProof;
  index: number;
  statement: {
    premises: { id: string; formula: string }[];
    rules: { id: string; label: string }[];
  };
  onChange: (step: DependencyProofStep) => void;
  allowKindChange: boolean;
  pending: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const step = proof.steps[index]!;
  const formulaHint = useId();
  const cached = useRef<{ inference?: Inference; assumption?: Assumption }>({});

  function chooseRule(value: string) {
    if (step.kind === 'premise') return;
    if (step.kind === 'inference') cached.current.inference = step;
    else cached.current.assumption = step;

    if (value === '__assumption__') {
      onChange({
        ...(cached.current.assumption ?? { kind: 'assumption', dependencies: [step.id] }),
        id: step.id,
        formula: step.formula,
      });
    } else {
      onChange({
        ...(cached.current.inference ?? {
          kind: 'inference',
          dependencies: [],
          lineReferences: [],
          discharges: [],
        }),
        id: step.id,
        formula: step.formula,
        ruleId: value || null,
      });
    }
  }

  return (
    <tr
      className="dependency-entry-row"
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
        if (
          !(event.target instanceof HTMLInputElement) ||
          !event.target.hasAttribute('data-proof-formula')
        )
          return;
        event.preventDefault();
        onConfirm();
      }}
    >
      <td className="proof-line-dependencies">
        <DependencySources steps={proof.steps} index={index} onChange={onChange} />
      </td>
      <th
        className="proof-line-number"
        scope="row"
        aria-label={`${allowKindChange ? 'New' : 'Editing'} line ${index + 1}`}
      >
        {index + 1}
      </th>
      <td className="proof-line-formula">
        <ProofFormulaInput
          data-proof-formula="true"
          aria-label={`Formula for line ${index + 1}`}
          aria-describedby={formulaHint}
          placeholder={step.kind === 'assumption' ? 'Assumption formula' : 'Formula'}
          maxLength={PROOF_LIMITS.maxFormulaLength}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={step.formula}
          onValueChange={(formula) => onChange({ ...step, formula })}
        />
        <span className="proof-control-label" id={formulaHint}>
          Contradiction: type _|_ for ⊥.
        </span>
      </td>
      <td className="proof-line-justification">
        <div className="dependency-entry-reasons">
          {step.kind === 'premise' ? (
            <ProofChoice
              label={`Statement premise for line ${index + 1}`}
              value={step.premiseId}
              empty="Premise"
              choices={statement.premises.map((premise, index) => ({
                id: premise.id,
                label: `${index + 1}. ${premise.formula || '(blank)'}`,
              }))}
              onChange={(premiseId) => onChange({ ...step, premiseId })}
            />
          ) : (
            <select
              aria-label={`Rule for line ${index + 1}`}
              value={step.kind === 'assumption' ? '__assumption__' : (step.ruleId ?? '')}
              disabled={!allowKindChange && step.kind === 'assumption'}
              onChange={(event) => chooseRule(event.target.value)}
            >
              <option value="">Rule</option>
              {(allowKindChange || step.kind === 'assumption') && (
                <option value="__assumption__">Assumption</option>
              )}
              {step.kind === 'inference' &&
                step.ruleId &&
                !statement.rules.some((rule) => rule.id === step.ruleId) && (
                  <option value={step.ruleId}>Unavailable rule</option>
                )}
              {statement.rules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.label}
                </option>
              ))}
            </select>
          )}
          {step.kind === 'inference' && (
            <DependencyInferenceFields
              step={step}
              index={index}
              steps={proof.steps}
              onChange={onChange}
              onStartAssumption={allowKindChange ? () => chooseRule('__assumption__') : undefined}
            />
          )}
        </div>
      </td>
      <td className="proof-line-action dependency-entry-actions">
        <button type="button" onClick={onConfirm}>
          {allowKindChange ? 'Add line' : 'Done editing'}
        </button>
        {allowKindChange && pending && (
          <button type="button" className="text-button" onClick={onDiscard}>
            Discard entry
          </button>
        )}
      </td>
    </tr>
  );
}
