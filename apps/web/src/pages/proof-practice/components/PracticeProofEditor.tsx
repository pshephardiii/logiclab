import type { ReactNode } from 'react';
import { FitchProofEditor } from '../../../features/proof/components/FitchProofEditor';
import { DependencyProofEditor } from '../../../features/proof/dependency/DependencyProofEditor';
import { isProofFormatAvailable } from '@logiclab/contracts';
import type { PracticeStatement, PracticeProof } from '../helpers/practice-proof';

/** Reuse student controls without importing owner-library drafts or private references. */
export function PracticeProofEditor({
  statement,
  proof,
  onChange,
  onPendingChange,
  actions,
  conclusionActions,
  onPremiseChange,
}: {
  statement: PracticeStatement;
  proof: PracticeProof | null;
  onChange: (proof: PracticeProof | null) => void;
  onPendingChange?: (pending: boolean) => void;
  actions?: ReactNode;
  conclusionActions?: ReactNode;
  onPremiseChange?: (premiseId: string, formula: string) => void;
}) {
  if (!isProofFormatAvailable(statement.format))
    return <p role="status">This proof method is unavailable for new practice.</p>;

  if (statement.format === 'dependency')
    return (
      <DependencyProofEditor
        showAssumptionGuides={false}
        actions={actions}
        conclusionActions={conclusionActions}
        onPremiseChange={onPremiseChange}
        onPendingChange={onPendingChange}
        statement={statement}
        proof={proof?.format === 'dependency' ? proof : null}
        purpose="student"
        onChange={onChange}
      />
    );

  return (
    <FitchProofEditor
      actions={actions}
      conclusionActions={conclusionActions}
      onPremiseChange={onPremiseChange}
      onPendingChange={onPendingChange}
      statement={statement}
      proof={proof?.format === 'fitch' ? proof : null}
      purpose="student"
      onChange={onChange}
    />
  );
}
