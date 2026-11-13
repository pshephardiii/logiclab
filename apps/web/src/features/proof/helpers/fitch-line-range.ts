import type { FitchProof } from '@logiclab/contracts';
import { fitchProofSubtree, uniqueFitchProofIds } from './fitch-editor';

/** Select by stable endpoints; never silently expand deletion beyond the displayed inclusive range. */
export function fitchLineRange(proof: FitchProof, from: string, to: string) {
  const first = proof.steps.findIndex((step) => step.id === from);
  const last = proof.steps.findIndex((step) => step.id === to);
  if (!uniqueFitchProofIds(proof) || first < 0 || last < 0) return null;

  const start = Math.min(first, last);
  const end = Math.max(first, last);
  const steps = proof.steps.slice(start, end + 1);
  const ids = new Set(steps.map((step) => step.id));
  const removedBlocks = new Set<string>();

  // Removing an assumption also removes its block metadata, but only if all of that
  // subproof's entered lines are selected. Partial interiors can be removed on their own.
  for (const block of proof.blocks) {
    if (!ids.has(block.assumptionId)) continue;
    for (const id of fitchProofSubtree(proof, block.id)) removedBlocks.add(id);
  }

  const remaining = proof.steps.filter((step) => !ids.has(step.id));
  const splitsSubproof = remaining.some(
    (step) =>
      (step.blockId !== null && removedBlocks.has(step.blockId)) ||
      proof.blocks.some((block) => removedBlocks.has(block.id) && block.assumptionId === step.id),
  );

  return {
    start,
    end,
    steps,
    error: splitsSubproof
      ? 'This range includes an assumption but leaves part of its subproof outside the selection. Cancel and select the entire subproof, or leave its assumption in place.'
      : null,
    next: {
      ...proof,
      steps: remaining,
      // Selecting all lines is also the explicit way to start an empty proof again.
      blocks: remaining.length ? proof.blocks.filter((block) => !removedBlocks.has(block.id)) : [],
    },
  };
}
