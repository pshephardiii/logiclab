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
}: {
  statement: PracticeStatement;
  proof: PracticeProof | null;
  onChange: (proof: PracticeProof | null) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  if (statement.format === 'tree')
    return (
      <TreeProofEditor
        statement={statement}
        proof={proof?.format === 'tree' ? proof : null}
        purpose="student"
        onChange={onChange}
      />
    );

  if (statement.format === 'dependency')
    return (
      <DependencyProofEditor
        onPendingChange={onPendingChange}
        statement={statement}
        proof={proof?.format === 'dependency' ? proof : null}
        purpose="student"
        onChange={onChange}
      />
    );

  return (
    <FitchProofEditor
      onPendingChange={onPendingChange}
      statement={statement}
      proof={proof?.format === 'fitch' ? proof : null}
      purpose="student"
      onChange={onChange}
    />
  );
}
