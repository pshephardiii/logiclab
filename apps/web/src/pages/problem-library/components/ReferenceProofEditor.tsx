import type { FitchProof } from '@logiclab/contracts';
import type { DerivationDefinition } from '@logiclab/contracts/derivation';
import { FitchProofEditor } from '../../../features/proof/components/FitchProofEditor';

/** Private definition stays at the authoring boundary; shared controls receive no key/explanation. */
export function ReferenceProofEditor({
  definition,
  onChange,
}: {
  definition: DerivationDefinition;
  onChange: (proof: FitchProof | null) => void;
}) {
  return (
    <FitchProofEditor
      statement={{ premises: definition.premises, rules: definition.rules }}
      proof={definition.referenceProof}
      purpose="reference"
      onChange={onChange}
    />
  );
}
