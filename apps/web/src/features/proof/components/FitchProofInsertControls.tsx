import { PROOF_LIMITS, type FitchProof } from '@logiclab/contracts';
import { fitchProofDepth } from '../helpers/fitch-editor';
import { ProofChoice } from './ProofChoice';

type Props = {
  proof: FitchProof;
  scope: string | null;
  before: string | null;
  lines: { id: string; label: string }[];
  blockChoices: { id: string; label: string }[];
  onScopeChange: (scope: string | null) => void;
  onBeforeChange: (before: string | null) => void;
  onInsert: (subproof: boolean, premise?: boolean) => void;
};

/** Controlled insertion options; the editor owns insertion and error handling. */
export function FitchProofInsertControls({
  proof,
  scope,
  before,
  lines,
  blockChoices,
  onScopeChange,
  onBeforeChange,
  onInsert,
}: Props) {
  return (
    <>
      <ProofChoice
        label="New line scope"
        value={scope}
        choices={blockChoices}
        empty="Root proof"
        onChange={onScopeChange}
      />
      <ProofChoice
        label="Insert before"
        value={before}
        choices={lines}
        empty="Append at end"
        onChange={onBeforeChange}
      />
      <div className="action-row">
        <button
          type="button"
          disabled={proof.steps.length >= PROOF_LIMITS.maxSteps}
          onClick={() => onInsert(false, true)}
        >
          Add premise line at root
        </button>
        <button
          type="button"
          disabled={proof.steps.length >= PROOF_LIMITS.maxSteps}
          onClick={() => onInsert(false)}
        >
          Add inference line
        </button>
        <button
          type="button"
          disabled={
            proof.steps.length >= PROOF_LIMITS.maxSteps ||
            proof.blocks.length >= PROOF_LIMITS.maxBlocks ||
            (fitchProofDepth(proof, scope) ?? PROOF_LIMITS.maxBlockDepth) >=
              PROOF_LIMITS.maxBlockDepth
          }
          onClick={() => onInsert(true)}
        >
          Open subproof
        </button>
      </div>
    </>
  );
}
