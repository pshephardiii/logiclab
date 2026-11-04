import { proofCheckReportSchema, type ProofCheckReport } from '@logiclab/contracts';
import type { StructureDiagnostics } from './structure-diagnostics';

export const PROOF_CHECKER_VERSION = 1;

export function finishProofReport(
  diagnostics: StructureDiagnostics,
  status: ProofCheckReport['status'],
  target: ProofCheckReport['target'] = 'unknown',
  steps: ProofCheckReport['steps'] = [],
): ProofCheckReport {
  return proofCheckReportSchema.parse({
    checkerVersion: PROOF_CHECKER_VERSION,
    ruleCatalogVersion: 1,
    status: diagnostics.limited ? 'unassessable' : status,
    target: diagnostics.limited ? 'unknown' : target,
    steps: diagnostics.limited ? [] : steps,
    diagnostics: diagnostics.result(),
  });
}
