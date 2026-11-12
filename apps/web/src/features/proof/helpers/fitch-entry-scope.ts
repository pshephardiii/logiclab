import type { FitchProof } from '@logiclab/contracts';
import { fitchProofDepth, fitchProofSubtree } from './fitch-editor';

/** Appending stays in the deepest open subproof, even after an earlier insertion or scope repair.
 * For independently open branches in a malformed draft, prefer the latest opening at equal depth.
 */
export function resumedFitchScope(proof: FitchProof | null): string | null {
  if (!proof) return null;

  let scope: string | null = null;
  let deepest = 0;
  const blocks = new Map(proof.blocks.map((block) => [block.id, block]));

  for (const step of proof.steps) {
    if (step.kind !== 'assumption' || !step.blockId) continue;
    const block = blocks.get(step.blockId);
    if (!block || block.assumptionId !== step.id || block.endId !== null) continue;

    const depth = fitchProofDepth(proof, block.id);
    if (depth !== null && depth >= deepest) {
      scope = block.id;
      deepest = depth;
    }
  }
  return scope;
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
