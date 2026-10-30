import { PROOF_LIMITS, type FitchProof } from '@logiclab/contracts';
import type { FitchBlockSpan, FitchLayout } from './fitch-types';
import type { StructureDiagnostics } from './structure-diagnostics';

/** Establish unambiguous block intervals before resolving any citations. */
export function buildFitchLayout(
  proof: FitchProof,
  diagnostics: StructureDiagnostics,
): FitchLayout | null {
  const stepIndices = new Map<string, number>();
  const declarations = new Map(proof.blocks.map((block) => [block.id, block]));
  const blocks = new Map<string, FitchBlockSpan>();
  proof.steps.forEach((step, stepIndex) => {
    if (stepIndices.has(step.id))
      diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Step IDs must be unique.',
        stepIndex,
      });
    else stepIndices.set(step.id, stepIndex);
  });
  const blockIds = new Set<string>();
  for (const block of proof.blocks) {
    if (blockIds.has(block.id) || stepIndices.has(block.id))
      diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Block IDs must be unique and distinct from step IDs.',
        blockId: block.id,
      });
    blockIds.add(block.id);
    if (block.parentId !== null && !declarations.has(block.parentId))
      diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Block parent does not exist.',
        blockId: block.id,
      });
    const assumptionIndex = stepIndices.get(block.assumptionId);
    const assumption = assumptionIndex === undefined ? undefined : proof.steps[assumptionIndex];
    if (
      assumptionIndex === undefined ||
      !assumption ||
      assumption.kind !== 'assumption' ||
      assumption.blockId !== block.id
    ) {
      diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Block must open with its own declared assumption step.',
        blockId: block.id,
      });
      continue;
    }
    const endIndex = block.endId === null ? null : stepIndices.get(block.endId);
    if (
      endIndex === undefined ||
      (endIndex !== null &&
        (endIndex < assumptionIndex || proof.steps[endIndex]!.blockId !== block.id))
    ) {
      diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Block endpoint must be its final direct step, at or after its assumption.',
        blockId: block.id,
      });
      continue;
    }
    blocks.set(block.id, { id: block.id, parentId: block.parentId, assumptionIndex, endIndex });
  }
  for (const step of proof.steps) {
    if (step.blockId !== null && !declarations.has(step.blockId))
      diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Step belongs to an unknown block.',
        stepIndex: stepIndices.get(step.id),
      });
    if (step.kind === 'assumption' && declarations.get(step.blockId)?.assumptionId !== step.id)
      diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Assumption step is not the declared opening of its block.',
        stepIndex: stepIndices.get(step.id),
      });
  }
  if (diagnostics.items.length) return null;

  for (const block of proof.blocks) {
    const seen = new Set<string>();
    let cursor: string | null = block.id;
    while (cursor !== null) {
      if (seen.has(cursor)) {
        diagnostics.add({
          code: 'INVALID_STRUCTURE',
          message: 'Block parents must not form a cycle.',
          blockId: block.id,
        });
        break;
      }
      seen.add(cursor);
      cursor = declarations.get(cursor)!.parentId;
    }
    if (seen.size > PROOF_LIMITS.maxBlockDepth)
      diagnostics.add({
        code: 'RESOURCE_LIMIT',
        message: 'Block nesting limit exceeded.',
        blockId: block.id,
      });
  }
  if (diagnostics.items.length) return null;

  const stack: FitchBlockSpan[] = [];
  const paths: string[][] = [];
  for (const [stepIndex, step] of proof.steps.entries()) {
    const scope = stack.at(-1)?.id ?? null;
    if (step.kind === 'assumption') {
      const block = blocks.get(step.blockId)!;
      if (block.parentId !== scope) {
        diagnostics.add({
          code: 'INVALID_STRUCTURE',
          message: 'Subproof must open inside its declared current parent.',
          stepIndex,
          blockId: block.id,
        });
        return null;
      }
      stack.push(block);
    } else if (step.blockId !== scope) {
      diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Step must remain in the current innermost open block.',
        stepIndex,
      });
      return null;
    }
    paths.push(stack.map((block) => block.id));
    if (stack.at(-1)?.endIndex === stepIndex) stack.pop();
  }
  for (const block of stack) {
    diagnostics.add({
      code: 'INCOMPLETE_PROOF',
      message: 'Subproof has no closing endpoint.',
      blockId: block.id,
      stepIndex: block.assumptionIndex,
    });
  }
  return { stepIndices, blocks, paths };
}
