import type { ProofSample } from '../samples/derivations';
import { formulaNotation } from '../../../components/formula/formula-notation';
import { FitchProofDisplay } from '../../proof/components/FitchProofDisplay';
import { DependencyProofDisplay } from '../../proof/dependency/DependencyProofDisplay';
import { CompletedSampleExample } from './CompletedSampleExample';

export function CompletedProofSample({ sample }: { sample: ProofSample }) {
  return (
    <CompletedSampleExample title={sample.title} introduction={sample.introduction}>
      <p>{sample.stages.at(-1)!.caption}</p>
      <p>
        <strong>Conclusion:</strong> <code>{formulaNotation(sample.statement.conclusion)}</code>
      </p>
      {sample.completed.format === 'fitch' ? (
        <FitchProofDisplay
          proof={sample.completed}
          rules={sample.statement.rules}
          readOnly
          label="Completed example Fitch proof"
        />
      ) : (
        <DependencyProofDisplay
          proof={sample.completed}
          rules={sample.statement.rules}
          selectedId={null}
          readOnly
          showAssumptionGuides={false}
          label="Completed example dependency proof"
        />
      )}
    </CompletedSampleExample>
  );
}
