import type { FitchProof } from '@logiclab/contracts';
import { fitchProofDepth, fitchProofSubtree } from './fitch-editor';

/** Resume the innermost open scope containing the last line; never follow malformed ancestry. */
export function resumedFitchScope(proof: FitchProof | null): string | null {
  let id = proof?.steps.at(-1)?.blockId ?? null;
  if (!proof || fitchProofDepth(proof, id) === null) return null;

  while (id) {
    const block = proof.blocks.find((block) => block.id === id)!;
    if (block.endId === null) return id;
    id = block.parentId;
  }
  return null;
}

/** Closing records a direct confirmed endpoint, never a pending line or an open child's interior. */
export function fitchScopeEndpoint(proof: FitchProof, scope: string | null, before: string | null) {
  const block = proof.blocks.find((block) => block.id === scope);
  if (!block || block.endId !== null || fitchProofDepth(proof, scope) === null) return null;

  const descendants = fitchProofSubtree(proof, block.id);
  if (
    proof.blocks.some(
      (child) => child.id !== block.id && descendants.has(child.id) && child.endId === null,
    )
  )
    return null;

  const end =
    before === null ? proof.steps.length : proof.steps.findIndex((step) => step.id === before);
  if (end < 0) return null;
  return (
    proof.steps
      .slice(0, end)
      .reverse()
      .find((step) => step.blockId === block.id) ?? null
  );
}
