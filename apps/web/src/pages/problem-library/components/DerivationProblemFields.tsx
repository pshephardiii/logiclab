import { isProblemMethodAvailable } from '../../../features/proof/helpers/method-availability';
import { DerivationSummary } from './DerivationSummary';
import { isProofFormatAvailable } from '@logiclab/contracts';
import { ProofPremisesEditor } from '../../../features/proof/components/ProofPremisesEditor';
import { ProofKeyboardGuide } from '../../../features/proof/reference/ProofKeyboardGuide';
import '../../../features/proof/components/proof-setup.css';
import './derivation-authoring.css';
import { ProofFormulaInput } from '../../../features/proof/components/ProofFormulaInput';
import { PROOF_LIMITS } from '@logiclab/contracts';
import { DERIVATION_AUTHORING_LIMITS } from '@logiclab/contracts/derivation';
import { DerivationRuleFields } from './DerivationRuleFields';
import { useState } from 'react';
import type { AuthoringDerivationDefinition } from '../helpers/problem-editor';
import type { DerivationAuthoringStep, ProblemEditorFields } from '../helpers/problem-editor';
import { ReferenceProofEditor } from './ReferenceProofEditor';
import { LocalReferenceCheck } from './LocalReferenceCheck';

type Props = {
  fields: ProblemEditorFields;
  authoringStep?: DerivationAuthoringStep;
  onChange: (fields: ProblemEditorFields) => void;
  entryPending?: boolean;
  onPendingChange?: (pending: boolean) => void;
  onPremisePendingChange?: (pending: boolean) => void;
};

const formulaInput = {
  maxLength: PROOF_LIMITS.maxFormulaLength,
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
} as const;

/** Statement edits preserve premise identities and the private reference, even when incomplete. */
export function DerivationProblemFields({
  fields,
  onChange,
  entryPending = false,
  onPendingChange,
  onPremisePendingChange,
  authoringStep = 'details',
}: Props) {
  const definition = fields.derivation;
  const hideStatement = authoringStep === 'reference';

  const [pendingFormat, setPendingFormat] = useState<
    AuthoringDerivationDefinition['format'] | null
  >(null);

  function change(
    patch: Partial<
      Pick<AuthoringDerivationDefinition, 'premises' | 'conclusion' | 'rules' | 'explanation'>
    >,
  ) {
    onChange({ ...fields, derivation: { ...definition, ...patch } });
  }

  if (!isProblemMethodAvailable(definition)) return <DerivationSummary definition={definition} />;

  return (
    <div className="derivation-authoring proof-editor">
      <div hidden={hideStatement}>
        <div className="proof-setup-toolbar">
          <div>
            <label htmlFor="derivation-format">Proof format</label>
            <select
              id="derivation-format"
              disabled={entryPending}
              value={definition.format}
              onChange={(event) => {
                const format = event.target.value as AuthoringDerivationDefinition['format'];

                if (!isProofFormatAvailable(format)) return;
                setPendingFormat(null);

                if (format === definition.format) return;

                if (definition.referenceProof) setPendingFormat(format);
                else
                  onChange({
                    ...fields,
                    derivation: { ...definition, format, referenceProof: null },
                  });
              }}
            >
              <option value="fitch">Fitch</option>
              <option value="dependency">Dependency</option>
            </select>
          </div>
          {!hideStatement && <ProofKeyboardGuide />}
        </div>
        {pendingFormat && (
          <div role="group" aria-label="Confirm proof format change">
            <p>
              Changing format discards the entire reference proof. Premises, conclusion, rules and
              explanation stay. No proof conversion is performed.
            </p>
            <button
              type="button"
              disabled={entryPending}
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
        <section hidden={hideStatement} className="derivation-authoring-statement">
          <p className="help">
            Save an unfinished statement now. Publication requires an accepted reference under these
            exact premises, conclusion and permitted rules. Published Fitch and dependency snapshots
            can be added to assignments.
          </p>
          <ProofPremisesEditor
            format={definition.format}
            premises={definition.premises}
            onChange={(premises) => change({ premises })}
            onPendingChange={onPremisePendingChange}
          />
          <label htmlFor="derivation-conclusion">Conclusion</label>
          <ProofFormulaInput
            id="derivation-conclusion"
            {...formulaInput}
            value={definition.conclusion}
            onValueChange={(conclusion) => change({ conclusion })}
          />
        </section>
        <div className="derivation-authoring-rules">
          <DerivationRuleFields
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
        </div>
        <div hidden={hideStatement}>
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
        </div>
      </div>
      <div hidden={authoringStep !== 'reference'}>
        <ReferenceProofEditor
          disabled={entryPending}
          onPendingChange={onPendingChange}
          definition={definition}
          onChange={(derivation) => onChange({ ...fields, derivation })}
        />
        <LocalReferenceCheck definition={definition} disabled={entryPending} />
      </div>
    </div>
  );
}
