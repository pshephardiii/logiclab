import type { createTruthTreeSample } from '../samples/truth-trees';
import { TruthTreeVerdict } from '@logiclab/contracts/truth-tree-work';
import { TruthTreeDisplay } from '../../truth-tree/components/TruthTreeDisplay';
import { SampleExample } from './SampleExample';

export function CompletedTruthTreeSample({
  sample,
  onExitSample,
}: {
  sample: ReturnType<typeof createTruthTreeSample>;
  onExitSample: () => void;
}) {
  return (
    <SampleExample
      onExitSample={onExitSample}
      title={sample.title}
      introduction={sample.introduction}
      stages={sample.stages}
      renderWork={(tree, final) => (
        <>
          {final && (
            <p className="sample-verdict">
              <strong>
                Sample argument: {sample.verdict === TruthTreeVerdict.Valid ? 'valid' : 'invalid'}.
              </strong>
            </p>
          )}
          <TruthTreeDisplay
            tree={tree}
            statement={sample.statement}
            label={final ? 'Completed example truth tree' : 'Example truth tree'}
          />
        </>
      )}
    />
  );
}
