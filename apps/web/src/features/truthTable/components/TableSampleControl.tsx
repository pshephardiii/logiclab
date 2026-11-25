import { SampleInvitation } from '../../practice/components/SampleInvitation';
import { useState } from 'react';
import { DiscardChangesDialog } from '../../unsaved-work/components/DiscardChangesDialog';
import { createTruthTableSample } from '../../practice/samples/truth-table';
import '../../practice/sample-actions.css';

/** Table work survives routing, so only destructive sample replacement needs this local prompt. */
export function TableSampleControl({
  hasWork,
  onLoad,
  onCreateOwn,
}: {
  hasWork: boolean;
  onLoad: (formula: string) => void;
  onCreateOwn?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  function load() {
    setConfirming(false);
    onLoad(createTruthTableSample().formula);
  }

  return (
    <SampleInvitation
      title="Try a sample problem"
      description="Load a ready-to-try problem, then explore its solution."
    >
      <button
        type="button"
        className="sample-action"
        onClick={() => (hasWork ? setConfirming(true) : load())}
      >
        Load sample problem
      </button>
      {onCreateOwn && (
        <button type="button" className="secondary" onClick={onCreateOwn}>
          Create your own problem
        </button>
      )}
      {confirming && <DiscardChangesDialog onStay={() => setConfirming(false)} onDiscard={load} />}
    </SampleInvitation>
  );
}
