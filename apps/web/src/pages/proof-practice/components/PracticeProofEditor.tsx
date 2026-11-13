import type { ReactNode } from 'react';
import { FitchProofEditor } from '../../../features/proof/components/FitchProofEditor';
import { DependencyProofEditor } from '../../../features/proof/dependency/DependencyProofEditor';
import { TreeProofEditor } from '../../../features/proof/tree/TreeProofEditor';
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
  if (statement.format === 'tree')
    return (
      <TreeProofEditor
        onPendingChange={onPendingChange}
        statement={statement}
        proof={proof?.format === 'tree' ? proof : null}
        purpose="student"
        onChange={onChange}
      />
    );

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
