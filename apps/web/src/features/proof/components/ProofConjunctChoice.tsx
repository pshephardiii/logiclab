import { proofConjunctChoices } from '../helpers/conjunct-choices';
import { ProofChoice } from './ProofChoice';

export function ProofConjunctChoice({
  index,
  value,
  source,
  onChange,
}: {
  index: number;
  value: number | null | undefined;
  source: string | undefined;
  onChange: (value: number | null) => void;
}) {
  return (
    <ProofChoice
      label={`Conjunct for line ${index + 1}`}
      placeholder="Conjunct"
      value={value == null ? null : String(value)}
      choices={proofConjunctChoices(source)}
      onChange={(id) => onChange(id === null ? null : Number(id))}
    />
  );
}
