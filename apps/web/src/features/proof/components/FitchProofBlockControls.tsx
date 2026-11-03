import type { FitchProof } from '@logiclab/contracts';
import { ProofChoice } from './ProofChoice';

type Block = FitchProof['blocks'][number];
type Props = {
  block: Block;
  label: string;
  parentChoices: { id: string; label: string }[];
  finalLineChoices: { id: string; label: string }[];
  onChange: (block: Block) => void;
  onDelete: () => void;
};

/** The parent supplies eligible choices and owns proof mutation/deletion confirmation. */
export function FitchProofBlockControls({
  block,
  label,
  parentChoices,
  finalLineChoices,
  onChange,
  onDelete,
}: Props) {
  return (
    <section className="problem-option" aria-label={label}>
      <h4>{label}</h4>
      <ProofChoice
        label={`Parent of ${label}`}
        value={block.parentId}
        empty="Root proof"
        choices={parentChoices}
        onChange={(parentId) => onChange({ ...block, parentId })}
      />
      <ProofChoice
        label={`Final line of ${label}`}
        value={block.endId}
        empty="Open / unfinished"
        choices={finalLineChoices}
        onChange={(endId) => onChange({ ...block, endId })}
      />
      <button type="button" className="secondary" onClick={onDelete}>
        Delete {label}
      </button>
    </section>
  );
}
