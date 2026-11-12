import type { FitchProofStep } from '@logiclab/contracts';
import type { FitchDerivationContent } from '@logiclab/contracts/derivation';
import { ProofChoice } from './ProofChoice';

type PremiseStep = Extract<FitchProofStep, { kind: 'premise' }>;

type Props = {
  step: PremiseStep;
  index: number;
  premises: FitchDerivationContent['premises'];
  onChange: (step: PremiseStep) => void;
  compact?: boolean;
};

export function FitchPremiseFields({ step, index, premises, onChange, compact = false }: Props) {
  return (
    <>
      {!compact && (
        <p className="help">
          Match this line’s formula to its selected statement premise. Linking a premise does not
          rewrite the formula.
        </p>
      )}
      <ProofChoice
        label={`Statement premise for line ${index + 1}`}
        placeholder={compact ? 'Statement premise' : undefined}
        value={step.premiseId}
        choices={premises.map((premise, position) => ({
          id: premise.id,
          label: `${position + 1}. ${premise.formula || '(blank)'}`,
        }))}
        onChange={(premiseId) => onChange({ ...step, premiseId })}
      />
    </>
  );
}
