import { PROOF_LIMITS, type FitchProof } from '@logiclab/contracts';
import { buildFitchLayout } from './fitch-layout';
import { resolveFitchReferences } from './fitch-references';
import { structureDiagnostics } from './structure-diagnostics';
import type { FitchStructureResult } from './fitch-types';

/** Analyze transport-validated Fitch data; this does not parse formulas or accept a proof. */
export function analyzeFitchStructure(proof: FitchProof): FitchStructureResult {
  if (proof.proofVersion !== 1 || proof.format !== 'fitch')
    return {
      status: 'unassessable',
      diagnostics: [
        { code: 'UNSUPPORTED_VERSION', message: 'Unsupported proof version or format.' },
      ],
    };
  if (proof.steps.length > PROOF_LIMITS.maxSteps || proof.blocks.length > PROOF_LIMITS.maxBlocks)
    return {
      status: 'unassessable',
      diagnostics: [{ code: 'RESOURCE_LIMIT', message: 'Proof step or block limit exceeded.' }],
    };
  const diagnostics = structureDiagnostics();
  const layout = buildFitchLayout(proof, diagnostics);
  if (!layout)
    return {
      status: diagnostics.limited ? 'unassessable' : 'invalid',
      diagnostics: diagnostics.result(),
    };
  const references = resolveFitchReferences(proof, layout, diagnostics);
  if (diagnostics.limited) return { status: 'unassessable', diagnostics: diagnostics.result() };
  return {
    status: 'resolved',
    diagnostics: diagnostics.result(),
    blocks: [...layout.blocks.values()].map((block) => ({ ...block })),
    references,
  };
}
