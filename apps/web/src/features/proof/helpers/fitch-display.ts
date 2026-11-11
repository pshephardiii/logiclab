import { PROOF_LIMITS, type FitchProof } from '@logiclab/contracts';

type Block = FitchProof['blocks'][number];

/** Follow the entered parent chain only; displaying a scope never validates or repairs it. */
export function fitchDisplayScope(blockId: string | null, blocks: ReadonlyMap<string, Block>) {
  const path: Block[] = [];
  const seen = new Set<string>();

  while (blockId !== null) {
    if (seen.has(blockId)) return { path: path.reverse(), warning: 'Cyclic subproof scope' };
    if (path.length >= PROOF_LIMITS.maxBlockDepth)
      return { path: path.reverse(), warning: 'Subproof nesting limit exceeded' };

    seen.add(blockId);
    const block = blocks.get(blockId);

    if (!block) return { path: path.reverse(), warning: 'Unavailable subproof' };

    path.push(block);
    blockId = block.parentId;
  }

  return { path: path.reverse(), warning: null };
}
