import { PROOF_LIMITS } from '@logiclab/contracts';
import { ProofFormulaInput } from '../../../features/proof/components/ProofFormulaInput';
import type { AuthoringDerivationDefinition } from '../helpers/problem-editor';

/** Immediate premise fields used by Fitch/tree authoring; unfinished rows remain saveable. */
export function DerivationPremiseFields({
  premises,
  onChange,
}: {
  premises: AuthoringDerivationDefinition['premises'];
  onChange: (premises: AuthoringDerivationDefinition['premises']) => void;
}) {
  function movePremise(index: number, delta: number) {
    const next = [...premises];
    [next[index], next[index + delta]] = [next[index + delta]!, next[index]!];
    onChange(next);
  }

  return (
    <section aria-label="Derivation premises">
      <h3>Premises</h3>
      {!premises.length && <p>No premises. A derivation may prove a theorem without premises.</p>}
      {premises.map((premise, index) => (
        <div className="problem-option" key={premise.id}>
          <label htmlFor={`premise-${premise.id}`}>Premise {index + 1}</label>
          <ProofFormulaInput
            id={`premise-${premise.id}`}
            maxLength={PROOF_LIMITS.maxFormulaLength}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={premise.formula}
            onValueChange={(formula) =>
              onChange(
                premises.map((value) => (value.id === premise.id ? { ...value, formula } : value)),
              )
            }
          />
          <div className="action-row">
            <button
              type="button"
              className="secondary"
              disabled={index === 0}
              onClick={() => movePremise(index, -1)}
            >
              Move premise {index + 1} up
            </button>
            <button
              type="button"
              className="secondary"
              disabled={index === premises.length - 1}
              onClick={() => movePremise(index, 1)}
            >
              Move premise {index + 1} down
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => onChange(premises.filter((value) => value.id !== premise.id))}
            >
              Remove premise {index + 1}
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={premises.length >= PROOF_LIMITS.maxPremises}
        onClick={() => onChange([...premises, { id: crypto.randomUUID(), formula: '' }])}
      >
        Add premise
      </button>
    </section>
  );
}
