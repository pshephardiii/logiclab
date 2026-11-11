import type { SavedDerivationAnswer } from '@logiclab/contracts/saved-student-work';
import { FitchProofSummary } from './FitchProofSummary';
import { DependencyProofSummary } from '../dependency/DependencyProofSummary';
import { TreeProofSummary } from '../tree/TreeProofSummary';

/** Read-only entered work or an already authorized reference; this component grants no access. */
export function ProofSummary({
  proof,
  format,
  rules,
  label,
}: {
  proof: SavedDerivationAnswer['proof'] | null;
  format: SavedDerivationAnswer['proof']['format'];
  rules: { id: string; label: string }[];
  label: string;
}) {
  if (format === 'tree') {
    const tree = proof?.format === 'tree' ? proof : null;

    return <TreeProofSummary proof={tree} rules={rules} label={label} />;
  }

  return format === 'dependency' ? (
    <DependencyProofSummary
      proof={proof?.format === 'dependency' ? proof : null}
      rules={rules}
      label={label}
    />
  ) : (
    <FitchProofSummary
      proof={proof?.format === 'fitch' ? proof : null}
      rules={rules}
      label={label}
    />
  );
}
