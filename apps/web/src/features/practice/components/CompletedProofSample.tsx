import type { FitchProof, DependencyProof } from '@logiclab/contracts';
import type { ProofSample } from '../samples/derivations';
import { formulaNotation } from '../../../components/formula/formula-notation';
import { FitchProofDisplay } from '../../proof/components/FitchProofDisplay';
import { DependencyProofDisplay } from '../../proof/dependency/DependencyProofDisplay';
import { SampleExample } from './SampleExample';

export function CompletedProofSample({ sample }: { sample: ProofSample }) {
  return (
    <SampleExample<FitchProof | DependencyProof>
      title={sample.title}
      introduction={sample.introduction}
      stages={sample.stages}
      renderWork={(proof, final) => (
        <>
          <p>
            <strong>Conclusion:</strong> <code>{formulaNotation(sample.statement.conclusion)}</code>
          </p>
          {proof.format === 'fitch' ? (
            <FitchProofDisplay
              proof={proof}
              rules={sample.statement.rules}
              selectedId={proof.steps.at(-1)?.id ?? null}
              readOnly
              label={final ? 'Completed example Fitch proof' : 'Example Fitch proof'}
            />
          ) : (
            <DependencyProofDisplay
              proof={proof}
              rules={sample.statement.rules}
              selectedId={proof.steps.at(-1)?.id ?? null}
              readOnly
              showAssumptionGuides={false}
              label={final ? 'Completed example dependency proof' : 'Example dependency proof'}
            />
          )}
        </>
      )}
    />
  );
}
