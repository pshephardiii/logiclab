import type { AuthoringDerivationDefinition } from '../helpers/problem-editor';
import { FitchProofEditor } from '../../../features/proof/components/FitchProofEditor';
import { DependencyProofEditor } from '../../../features/proof/dependency/DependencyProofEditor';
import { TreeProofEditor } from '../../../features/proof/tree/TreeProofEditor';

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
      <TreeProofEditor
        key="tree"
        statement={definition}
        proof={definition.referenceProof}
        onChange={(referenceProof) => onChange({ ...definition, referenceProof })}
      />
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
