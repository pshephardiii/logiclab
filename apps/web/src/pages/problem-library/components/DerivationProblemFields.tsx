import { PROOF_LIMITS } from '@logiclab/contracts';
import { DERIVATION_AUTHORING_LIMITS } from '@logiclab/contracts/derivation';
import { DerivationRuleFields } from './DerivationRuleFields';
import { useState } from 'react';
import type { AuthoringDerivationDefinition } from '../helpers/problem-editor';
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
  const [pendingFormat, setPendingFormat] = useState<'fitch' | 'dependency' | null>(null);
  function change(
    patch: Partial<
      Pick<AuthoringDerivationDefinition, 'premises' | 'conclusion' | 'rules' | 'explanation'>
    >,
  ) {
    onChange({ ...fields, derivation: { ...definition, ...patch } });
  }
  function movePremise(index: number, delta: number) {
    const premises = [...definition.premises];
    [premises[index], premises[index + delta]] = [premises[index + delta]!, premises[index]!];
    change({ premises });
  }
  return (
    <>
      <label htmlFor="derivation-format">Proof format</label>
      <select
        id="derivation-format"
        value={definition.format}
        onChange={(event) => {
          const format = event.target.value as 'fitch' | 'dependency';
          setPendingFormat(null);
          if (format === definition.format) return;
          if (definition.referenceProof) setPendingFormat(format);
          else onChange({ ...fields, derivation: { ...definition, format, referenceProof: null } });
        }}
      >
        <option value="fitch">Fitch</option>
        <option value="dependency">Dependency</option>
      </select>
      {pendingFormat && (
        <div role="group" aria-label="Confirm proof format change">
          <p>
            Changing format discards the entire reference proof. Premises, conclusion, rules and
            explanation stay. No proof conversion is performed.
          </p>
          <button
            type="button"
            onClick={() => {
              onChange({
                ...fields,
                derivation: { ...definition, format: pendingFormat, referenceProof: null },
              });
              setPendingFormat(null);
            }}
          >
            Change format and discard reference
          </button>
          <button type="button" className="secondary" onClick={() => setPendingFormat(null)}>
            Keep current format
          </button>
        </div>
      )}
      <p className="help">
        Save an unfinished statement now. Publication requires an accepted reference under these
        exact premises, conclusion and permitted rules. Dependency derivations cannot be assigned
        yet.
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
      <DerivationRuleFields
        format={definition.format}
        rules={definition.rules}
        labels={fields.derivationLabels}
        onChange={(rules, derivationLabels) =>
          onChange({
            ...fields,
            derivationLabels,
            derivation: { ...definition, rules },
          })
        }
      />
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
        onChange={(derivation) => onChange({ ...fields, derivation })}
      />
      <LocalReferenceCheck definition={definition} />
    </>
  );
}
