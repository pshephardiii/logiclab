import { ProofFormulaInput } from './ProofFormulaInput';
import type { FitchDerivationContent } from '@logiclab/contracts/derivation';
import type { FitchProof, FitchProofStep } from '@logiclab/contracts';
import { PROOF_LIMITS } from '@logiclab/contracts';
import { FitchPremiseFields } from './FitchPremiseFields';
import { FitchInferenceFields } from './FitchInferenceFields';
import { useId } from 'react';
import { ProofFormulaHint } from '../reference/ProofKeyboardGuide';

type Props = {
  statement: Pick<FitchDerivationContent, 'premises' | 'rules'>;
  purpose: 'reference' | 'student';
  proof: FitchProof;
  index: number;
  blocks: { id: string; label: string }[];
  onChange: (step: FitchProofStep) => void;
};

export function FitchProofLine({ statement, purpose, proof, index, blocks, onChange }: Props) {
  const step = proof.steps[index]!;
  const formulaHint = useId();

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
        <ProofFormulaInput
          data-proof-formula="true"
          maxLength={PROOF_LIMITS.maxFormulaLength}
          aria-describedby={formulaHint}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={step.formula}
          onValueChange={(formula) => onChange({ ...step, formula })}
        />
      </label>
      <ProofFormulaHint id={formulaHint} />
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
          Use the assumption line’s menu for subproof settings.
        </p>
      )}
    </section>
  );
}
