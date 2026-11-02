import type { DerivationDefinition } from '@logiclab/contracts/derivation';
import { FitchProofSummary } from '../../../features/proof/components/FitchProofSummary';

/** Private authoring view; student proof summaries never receive this definition. */
export function DerivationReferenceSummary({ definition }: { definition: DerivationDefinition }) {
  return (
    <FitchProofSummary
      proof={definition.referenceProof}
      rules={definition.rules}
      label="Private reference proof"
    >
      <p>{definition.explanation || 'No explanation.'}</p>
    </FitchProofSummary>
  );
}
