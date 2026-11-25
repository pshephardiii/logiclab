import type { createTruthTreeSample } from '../samples/truth-trees';
import { TruthTreeVerdict } from '@logiclab/contracts/truth-tree-work';
import { TruthTreeDisplay } from '../../truth-tree/components/TruthTreeDisplay';
import { CompletedSampleExample } from './CompletedSampleExample';

export function CompletedTruthTreeSample({
  sample,
}: {
  sample: ReturnType<typeof createTruthTreeSample>;
}) {
  const valid = sample.verdict === TruthTreeVerdict.Valid;

  return (
    <CompletedSampleExample title={sample.title} introduction={sample.introduction}>
      <p className="sample-verdict">
        <strong>Sample argument: {valid ? 'valid' : 'invalid'}.</strong>{' '}
        {sample.stages.at(-1)!.caption}
      </p>
      <TruthTreeDisplay
        tree={sample.completed}
        statement={sample.statement}
        label="Completed example truth tree"
      />
    </CompletedSampleExample>
  );
}
