import { PROOF_LIMITS } from '@logiclab/contracts';
import { DERIVATION_AUTHORING_LIMITS } from '@logiclab/contracts/derivation';
import { PROPOSITIONAL_RULE_CATALOG } from '@logiclab/logic-engine/proof/rules';
import type { DerivationDefinition } from '@logiclab/contracts/derivation';
import type { ProblemEditorFields } from '../helpers/problem-editor';
import { ReferenceProofEditor } from './ReferenceProofEditor';
import { LocalReferenceCheck } from './LocalReferenceCheck';

type Props = { fields: ProblemEditorFields; onChange: (fields: ProblemEditorFields) => void };
const formulaInput = {
  maxLength: PROOF_LIMITS.maxFormulaLength,
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
} as const;

/** Statement edits preserve premise identities and the private reference, even when incomplete. */
export function DerivationProblemFields({ fields, onChange }: Props) {
  const definition = fields.derivation;
  function change(patch: Partial<DerivationDefinition>) {
    onChange({ ...fields, derivation: { ...definition, ...patch } });
  }
  function movePremise(index: number, delta: number) {
    const premises = [...definition.premises];
    [premises[index], premises[index + delta]] = [premises[index + delta]!, premises[index]!];
    change({ premises });
  }
  return (
    <>
      <p>
        <strong>Proof format:</strong> Fitch
      </p>
      <p className="help">
        Save an unfinished statement now. Publication requires an accepted reference under these
        exact premises, conclusion and permitted rules. Derivations cannot be assigned yet.
      </p>
      <section aria-label="Derivation premises">
        <h3>Premises</h3>
        {!definition.premises.length && (
          <p>No premises. A derivation may prove a theorem without premises.</p>
        )}
        {definition.premises.map((premise, index) => (
          <div className="problem-option" key={premise.id}>
            <label htmlFor={`premise-${premise.id}`}>Premise {index + 1}</label>
            <input
              id={`premise-${premise.id}`}
              {...formulaInput}
              value={premise.formula}
              onChange={(event) =>
                change({
                  premises: definition.premises.map((value) =>
                    value.id === premise.id ? { ...value, formula: event.target.value } : value,
                  ),
                })
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
                disabled={index === definition.premises.length - 1}
                onClick={() => movePremise(index, 1)}
              >
                Move premise {index + 1} down
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  change({
                    premises: definition.premises.filter((value) => value.id !== premise.id),
                  })
                }
              >
                Remove premise {index + 1}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          disabled={definition.premises.length >= PROOF_LIMITS.maxPremises}
          onClick={() =>
            change({ premises: [...definition.premises, { id: crypto.randomUUID(), formula: '' }] })
          }
        >
          Add premise
        </button>
      </section>
      <label htmlFor="derivation-conclusion">Conclusion</label>
      <input
        id="derivation-conclusion"
        {...formulaInput}
        value={definition.conclusion}
        onChange={(event) => change({ conclusion: event.target.value })}
      />
      <section aria-label="Derivation rules">
        <h3>Permitted rules and labels</h3>
        <p className="help">
          Enable each permitted rule explicitly. Choose a suggested label or type your own; labels
          do not change the rule. Enabled labels must be distinct, including case and spacing
          variations.
        </p>
        {PROPOSITIONAL_RULE_CATALOG.map((rule) => {
          const enabled = definition.rules.some((value) => value.id === rule.id);
          const label = fields.derivationLabels[rule.id] ?? rule.label;
          return (
            <div className="problem-option" key={rule.id}>
              <label className="correct-option">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) =>
                    change({
                      rules: event.target.checked
                        ? [...definition.rules, { id: rule.id, label }]
                        : definition.rules.filter((value) => value.id !== rule.id),
                    })
                  }
                />
                Allow {rule.label}
              </label>
              <p className="help">
                {rule.category === 'classical' ? 'Classical rule. ' : ''}Cites {rule.lineReferences}{' '}
                line(s) and {rule.subproofReferences} subproof(s).
              </p>
              <label htmlFor={`rule-label-${rule.id}`}>Label for {rule.label}</label>
              <input
                id={`rule-label-${rule.id}`}
                list={`rule-suggestions-${rule.id}`}
                disabled={!enabled}
                maxLength={DERIVATION_AUTHORING_LIMITS.ruleLabel}
                value={label}
                onChange={(event) =>
                  onChange({
                    ...fields,
                    derivationLabels: { ...fields.derivationLabels, [rule.id]: event.target.value },
                    derivation: {
                      ...definition,
                      rules: definition.rules.map((value) =>
                        value.id === rule.id ? { ...value, label: event.target.value } : value,
                      ),
                    },
                  })
                }
              />
              <datalist id={`rule-suggestions-${rule.id}`}>
                {[rule.label, ...rule.aliases].map((label) => (
                  <option key={label} value={label} />
                ))}
              </datalist>
            </div>
          );
        })}
      </section>
      <label htmlFor="derivation-explanation">Reference explanation (optional)</label>
      <textarea
        id="derivation-explanation"
        maxLength={DERIVATION_AUTHORING_LIMITS.explanation}
        value={definition.explanation ?? ''}
        onChange={(event) => change({ explanation: event.target.value || null })}
      />
      <p className="help">
        The explanation is private reference-answer content. Changing the statement or rules
        preserves the existing reference; check it again after saving.
      </p>
      <ReferenceProofEditor
        definition={definition}
        onChange={(referenceProof) => change({ referenceProof })}
      />
      <LocalReferenceCheck definition={definition} />
    </>
  );
}
