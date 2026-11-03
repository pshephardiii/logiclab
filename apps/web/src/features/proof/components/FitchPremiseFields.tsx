import type { ProofStep } from '@logiclab/contracts';
import type { DerivationContent } from '@logiclab/contracts/derivation';
import { ProofChoice } from './ProofChoice';

type PremiseStep = Extract<ProofStep, { kind: 'premise' }>;
type Props = {
  step: PremiseStep;
  index: number;
  premises: DerivationContent['premises'];
  onChange: (step: PremiseStep) => void;
};

export function FitchPremiseFields({ step, index, premises, onChange }: Props) {
  return (
    <>
      <p className="help">
        Match this line’s formula to its selected statement premise. Linking a premise does not
        rewrite the formula.
      </p>
      <ProofChoice
        label={`Statement premise for line ${index + 1}`}
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
