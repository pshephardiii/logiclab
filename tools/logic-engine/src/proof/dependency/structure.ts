import { PROOF_LIMITS, type DependencyProof, type ProofDiagnostic } from '@logiclab/contracts';
import { structureDiagnostics } from '../structure-diagnostics';

export type DependencyReferences =
  | {
      status: 'resolved';
      lineIndices: number[];
      discharges: { assumptionIndex: number; conclusionIndex: number }[];
    }
  | { status: 'invalid' | 'unassessable' };
export type DependencyStructureResult =
  | { status: 'invalid' | 'unassessable'; diagnostics: ProofDiagnostic[] }
  | {
      status: 'resolved';
      diagnostics: ProofDiagnostic[];
      references: DependencyReferences[];
      annotationsValid: boolean[];
    };

/** Transport-validated flat data only; formula matching and expected dependency sets are separate. */
export function analyzeDependencyStructure(proof: DependencyProof): DependencyStructureResult {
  const diagnostics = structureDiagnostics();
  if (proof.proofVersion !== 1 || proof.format !== 'dependency')
    return {
      status: 'unassessable',
      diagnostics: [
        { code: 'UNSUPPORTED_VERSION', message: 'Unsupported dependency proof format or version.' },
      ],
    };
  if (
    proof.steps.length > PROOF_LIMITS.maxSteps ||
    proof.steps.some(
      (step) =>
        step.dependencies.length > PROOF_LIMITS.maxSteps ||
        (step.kind === 'inference' &&
          (step.lineReferences.length > 2 || step.discharges.length > 2)),
    )
  )
    return {
      status: 'unassessable',
      diagnostics: [{ code: 'RESOURCE_LIMIT', message: 'Dependency proof list limit exceeded.' }],
    };
  // Ambiguous identities must be rejected before interpreting citations or written source sets.
  const indices = new Map<string, number>();
  for (const [stepIndex, step] of proof.steps.entries()) {
    if (indices.has(step.id))
      diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Step IDs must be unique.',
        stepIndex,
      });
    indices.set(step.id, stepIndex);
  }
  if (diagnostics.items.length) return { status: 'invalid', diagnostics: diagnostics.result() };
  const references: DependencyReferences[] = [];
  const annotationsValid: boolean[] = [];
  for (const [stepIndex, step] of proof.steps.entries()) {
    if (diagnostics.exhausted) break;
    let annotationValid = true;
    const seen = new Set<string>();
    // Written annotations may name only available premise/assumption sources, with no duplicates.
    for (const dependency of step.dependencies) {
      const index = indices.get(dependency);
      if (
        seen.has(dependency) ||
        index === undefined ||
        index > stepIndex ||
        proof.steps[index]!.kind === 'inference'
      ) {
        annotationValid = false;
        diagnostics.add({
          code: 'INVALID_DEPENDENCY',
          message: 'Dependencies must be distinct available premise or assumption line IDs.',
          stepIndex,
        });
      }
      seen.add(dependency);
    }
    annotationsValid.push(annotationValid);
    if (step.kind !== 'inference') {
      references.push({ status: 'resolved', lineIndices: [], discharges: [] });
      continue;
    }
    let invalid = false,
      incomplete = false;
    const fail = (message: string) => {
      invalid = true;
      diagnostics.add({ code: 'INVALID_REFERENCE', message, stepIndex });
    };
    const lineIndices: number[] = [];
    for (const id of step.lineReferences) {
      const index = indices.get(id);
      if (index === undefined || index >= stepIndex)
        fail('Line citation must identify an earlier step.');
      else lineIndices.push(index);
    }
    // Resolve assumption/conclusion pairs by chronology; there is no global Fitch-style box closure.
    const discharges: { assumptionIndex: number; conclusionIndex: number }[] = [];
    const assumptions = new Set<string>();
    for (const pair of step.discharges) {
      if (pair.assumptionId === null || pair.conclusionId === null) {
        incomplete = true;
        diagnostics.add({
          code: 'INCOMPLETE_PROOF',
          message: 'Discharge needs an assumption and a concluding line.',
          stepIndex,
        });
        continue;
      }
      const assumptionIndex = indices.get(pair.assumptionId),
        conclusionIndex = indices.get(pair.conclusionId);
      if (
        assumptions.has(pair.assumptionId) ||
        assumptionIndex === undefined ||
        conclusionIndex === undefined ||
        assumptionIndex > conclusionIndex ||
        conclusionIndex >= stepIndex ||
        proof.steps[assumptionIndex]!.kind !== 'assumption'
      )
        fail(
          'Discharge requires distinct earlier assumptions and conclusions at or after those assumptions.',
        );
      else discharges.push({ assumptionIndex, conclusionIndex });
      assumptions.add(pair.assumptionId);
    }
    // An inference gets usable citations only when every required identity resolves safely.
    references.push(
      invalid
        ? { status: 'invalid' }
        : incomplete
          ? { status: 'unassessable' }
          : { status: 'resolved', lineIndices, discharges },
    );
  }
  return diagnostics.limited
    ? { status: 'unassessable', diagnostics: diagnostics.result() }
    : { status: 'resolved', diagnostics: diagnostics.result(), references, annotationsValid };
}
