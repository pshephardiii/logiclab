import type { AuthoringDerivationDefinition } from '../helpers/problem-editor';
import { FitchProofEditor } from '../../../features/proof/components/FitchProofEditor';
import { DependencyProofEditor } from '../../../features/proof/dependency/DependencyProofEditor';
import { TreeProofSummary } from '../../../features/proof/tree/TreeProofSummary';

/** Private definition stays at the authoring boundary; controls receive no explanation/key. */
export function ReferenceProofEditor({
  definition,
  onChange,
}: {
  definition: AuthoringDerivationDefinition;
  onChange: (definition: AuthoringDerivationDefinition) => void;
}) {
  if (definition.format === 'tree')
    return (
      <>
        <p className="help">
          The saved tree reference is preserved. Tree reference editing is not available yet.
        </p>
        <TreeProofSummary
          proof={definition.referenceProof}
          rules={definition.rules}
          label="Reference proof (read-only)"
        />
      </>
    );
  return definition.format === 'dependency' ? (
    <DependencyProofEditor
      key="dependency"
      statement={definition}
      proof={definition.referenceProof}
      onChange={(referenceProof) => onChange({ ...definition, referenceProof })}
    />
  ) : (
    <FitchProofEditor
      key="fitch"
      statement={definition}
      proof={definition.referenceProof}
      purpose="reference"
      onChange={(referenceProof) => onChange({ ...definition, referenceProof })}
    />
  );
}
