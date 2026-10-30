import { PROOF_LIMITS, type FitchProof } from '@logiclab/contracts';
import type { DerivationDefinition } from '@logiclab/contracts/derivation';

export function startReference(definition: DerivationDefinition): FitchProof {
  return {
    proofVersion: 1,
    format: 'fitch',
    blocks: [],
    steps: definition.premises.map((premise) => ({
      kind: 'premise',
      id: crypto.randomUUID(),
      blockId: null,
      formula: premise.formula,
      premiseId: premise.id,
    })),
  };
}

export function uniqueReferenceIds(proof: FitchProof): boolean {
  const ids = [...proof.steps.map((step) => step.id), ...proof.blocks.map((block) => block.id)];
  return new Set(ids).size === ids.length;
}

/** Bound malformed parent walks; never recurse over a draft supplied by the server. */
export function referenceDepth(proof: FitchProof, blockId: string | null): number | null {
  const blocks = new Map(proof.blocks.map((block) => [block.id, block]));
  const seen = new Set<string>();
  while (blockId !== null) {
    if (seen.has(blockId)) return null;
    seen.add(blockId);
    const block = blocks.get(blockId);
    if (!block) return null;
    blockId = block.parentId;
  }
  return seen.size;
}

export function insertReferenceStep(
  proof: FitchProof,
  index: number,
  blockId: string | null,
  subproof = false,
): FitchProof {
  if (!uniqueReferenceIds(proof))
    throw new Error('Repair duplicate reference identities before inserting lines.');
  if (index < 0 || index > proof.steps.length || !Number.isInteger(index))
    throw new Error('Choose an existing insertion position.');
  if (proof.steps.length >= PROOF_LIMITS.maxSteps)
    throw new Error('The reference line limit has been reached.');
  const depth = referenceDepth(proof, blockId);
  if (depth === null) throw new Error('Choose a scope with a valid parent chain.');
  if (
    subproof &&
    (proof.blocks.length >= PROOF_LIMITS.maxBlocks || depth >= PROOF_LIMITS.maxBlockDepth)
  )
    throw new Error('The subproof count or nesting limit has been reached.');
  const id = crypto.randomUUID();
  const newBlock = crypto.randomUUID();
  const step = subproof
    ? { kind: 'assumption' as const, id, blockId: newBlock, formula: '' }
    : {
        kind: 'inference' as const,
        id,
        blockId,
        formula: '',
        ruleId: null,
        lineReferences: [],
        subproofReferences: [],
      };
  return {
    ...proof,
    steps: [...proof.steps.slice(0, index), step, ...proof.steps.slice(index)],
    blocks: subproof
      ? [...proof.blocks, { id: newBlock, parentId: blockId, assumptionId: id, endId: null }]
      : proof.blocks,
  };
}

export function moveReferenceStep(proof: FitchProof, index: number, delta: -1 | 1): FitchProof {
  const next = index + delta;
  if (!proof.steps[index] || !proof.steps[next]) return proof;
  const steps = [...proof.steps];
  [steps[index], steps[next]] = [steps[next]!, steps[index]!];
  return { ...proof, steps };
}

/** Preserve incoming citations/endpoints as missing IDs; never redirect them to a neighbor. */
export function removeReferenceStep(proof: FitchProof, index: number): FitchProof {
  if (proof.steps[index]?.kind === 'assumption')
    throw new Error('Delete the assumption’s entire subproof instead.');
  return { ...proof, steps: proof.steps.filter((_, position) => position !== index) };
}

export function referenceSubtree(proof: FitchProof, id: string): Set<string> {
  const ids = new Set([id]);
  for (let pass = 0; pass < proof.blocks.length; pass++) {
    const count = ids.size;
    for (const block of proof.blocks)
      if (block.parentId && ids.has(block.parentId)) ids.add(block.id);
    if (count === ids.size) break;
  }
  return ids;
}

export function removeReferenceSubproof(proof: FitchProof, id: string): FitchProof {
  const ids = referenceSubtree(proof, id);
  return {
    ...proof,
    steps: proof.steps.filter((step) => !step.blockId || !ids.has(step.blockId)),
    blocks: proof.blocks.filter((block) => !ids.has(block.id)),
  };
}

export function insertReferencePremise(proof: FitchProof, index: number): FitchProof {
  const next = insertReferenceStep(proof, index, null);
  const line = next.steps[index]!;
  return {
    ...next,
    steps: next.steps.map((step, position) =>
      position === index
        ? { kind: 'premise', id: line.id, blockId: null, formula: '', premiseId: null }
        : step,
    ),
  };
}
