import type { AuthoringDerivationDefinition } from '../helpers/problem-editor';
import { DependencyProofSummary } from '../../../features/proof/dependency/DependencyProofSummary';
import { FitchProofSummary } from '../../../features/proof/components/FitchProofSummary';

/** Private authoring view; student proof summaries never receive this definition. */
export function DerivationReferenceSummary({
  definition,
}: {
  definition: AuthoringDerivationDefinition;
}) {
  if (definition.format === 'dependency')
    return (
      <DependencyProofSummary
        proof={definition.referenceProof}
        rules={definition.rules}
        label="Private reference proof"
      >
        <p>{definition.explanation || 'No explanation.'}</p>
      </DependencyProofSummary>
    );
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
