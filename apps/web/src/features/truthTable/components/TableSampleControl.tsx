import { useState } from 'react';
import { DiscardChangesDialog } from '../../unsaved-work/components/DiscardChangesDialog';
import { createTruthTableSample } from '../../practice/samples/truth-table';
import '../../practice/sample-actions.css';

/** Table work survives routing, so only destructive sample replacement needs this local prompt. */
export function TableSampleControl({
  hasWork,
  onLoad,
}: {
  hasWork: boolean;
  onLoad: (formula: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  function load() {
    setConfirming(false);
    onLoad(createTruthTableSample().formula);
  }

  return (
    <div className="practice-sample-actions">
      <button
        type="button"
        className="secondary"
        onClick={() => (hasWork ? setConfirming(true) : load())}
      >
        Load sample problem
      </button>
      {confirming && <DiscardChangesDialog onStay={() => setConfirming(false)} onDiscard={load} />}
    </div>
  );
}
