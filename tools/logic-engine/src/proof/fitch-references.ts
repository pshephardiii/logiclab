import type { FitchProof } from '@logiclab/contracts';
import type { ClosedFitchBlockSpan, FitchLayout, FitchReferenceCheck } from './fitch-types';
import type { StructureDiagnostics } from './structure-diagnostics';

/** Never expose resolved citations for an inference with an inaccessible or incomplete reference. */
export function resolveFitchReferences(
  proof: FitchProof,
  layout: FitchLayout,
  diagnostics: StructureDiagnostics,
): FitchReferenceCheck[] {
  const checks: FitchReferenceCheck[] = [];
  for (const [stepIndex, step] of proof.steps.entries()) {
    if (diagnostics.exhausted) break;
    if (step.kind !== 'inference') continue;
    let invalid = false;
    let incomplete = false;
    const lineIndices: number[] = [];
    const subproofs: ClosedFitchBlockSpan[] = [];
    const fail = (message: string) => {
      invalid = true;
      diagnostics.add({ code: 'INVALID_REFERENCE', message, stepIndex });
    };
    for (const id of step.lineReferences) {
      const index = layout.stepIndices.get(id);
      if (index === undefined || index >= stepIndex) {
        fail('Line citation must identify an earlier step.');
        continue;
      }
      const blockId = proof.steps[index]!.blockId;
      if (blockId !== null && !layout.paths[stepIndex]!.includes(blockId)) {
        fail('Line citation is outside the current or ancestor scope.');
        continue;
      }
      lineIndices.push(index);
    }
    const seen = new Set<string>();
    for (const id of step.subproofReferences) {
      if (seen.has(id)) {
        fail('Subproof citations must identify distinct blocks.');
        continue;
      }
      seen.add(id);
      const block = layout.blocks.get(id);
      if (!block || block.parentId !== step.blockId || block.assumptionIndex >= stepIndex) {
        fail('Subproof citation must identify an earlier direct child of the current scope.');
        continue;
      }
      if (block.endIndex === null) {
        incomplete = true;
        diagnostics.add({
          code: 'INCOMPLETE_PROOF',
          message: 'Cited subproof is not closed.',
          stepIndex,
          blockId: id,
        });
      } else if (block.endIndex >= stepIndex) {
        fail('Subproof citation must follow its closing endpoint.');
      } else subproofs.push({ ...block, endIndex: block.endIndex });
    }
    checks.push(
      invalid
        ? { status: 'invalid', stepIndex }
        : incomplete
          ? { status: 'unassessable', stepIndex }
          : { status: 'resolved', stepIndex, lineIndices, subproofs },
    );
  }
  return checks;
}
