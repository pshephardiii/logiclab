import type { FitchProof } from '@logiclab/contracts';

/** Display positions remain separate from stable line/block identities. */
export function fitchEditorChoices(proof: FitchProof) {
  const lines = proof.steps.map((line, index) => ({
    id: line.id,
    label: `${index + 1}. ${line.formula || '(blank)'}`,
  }));

  const lineScopes = new Map(proof.steps.map((step) => [step.id, step.blockId]));

  const blockChoices = proof.blocks.map((block, index) => ({
    id: block.id,
    label: `Subproof ${index + 1} at line ${proof.steps.findIndex((step) => step.id === block.assumptionId) + 1 || '?'}`,
    citationLabel: block.endId
      ? `Lines ${proof.steps.findIndex((step) => step.id === block.assumptionId) + 1 || '?'}–${proof.steps.findIndex((step) => step.id === block.endId) + 1 || '?'}`
      : `From line ${proof.steps.findIndex((step) => step.id === block.assumptionId) + 1 || '?'} (not closed)`,
  }));

  return { lines, lineScopes, blockChoices };
}
