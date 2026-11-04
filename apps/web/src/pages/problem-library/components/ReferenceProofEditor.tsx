import type { AuthoringDerivationDefinition } from '../helpers/problem-editor';
import { FitchProofEditor } from '../../../features/proof/components/FitchProofEditor';
import { DependencyProofEditor } from '../../../features/proof/dependency/DependencyProofEditor';

/** Private definition stays at the authoring boundary; controls receive no explanation/key. */
export function ReferenceProofEditor({
  definition,
  onChange,
}: {
  definition: AuthoringDerivationDefinition;
  onChange: (definition: AuthoringDerivationDefinition) => void;
}) {
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
