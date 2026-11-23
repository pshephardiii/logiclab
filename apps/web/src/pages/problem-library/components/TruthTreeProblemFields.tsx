import { useState } from 'react';
import { TRUTH_TREE_LIMITS } from '@logiclab/contracts/truth-tree';
import { ProofPremisesEditor } from '../../../features/proof/components/ProofPremisesEditor';
import { ProofFormulaInput } from '../../../features/proof/components/ProofFormulaInput';
import { ProofKeyboardGuide } from '../../../features/proof/reference/ProofKeyboardGuide';
import { ProofDeletionPrompt } from '../../../features/proof/components/ProofDeletionPrompt';
import { TruthTreeEditor } from '../../../features/truth-tree/components/TruthTreeEditor';
import { TruthTreeSummary } from '../../../features/truth-tree/components/TruthTreeSummary';
import {
  initialTruthTree,
  truthTreeInitialMatches,
} from '../../../features/truth-tree/helpers/construction';
import type { ProblemEditorFields, DerivationAuthoringStep } from '../helpers/problem-editor';
import { LocalTruthTreeCheck } from './LocalTruthTreeCheck';

export function TruthTreeProblemFields({
  fields,
  authoringStep,
  onChange,
  pending,
  onPendingChange,
  onPremisePendingChange,
  disabled,
}: {
  fields: ProblemEditorFields;
  authoringStep: DerivationAuthoringStep;
  onChange: (fields: ProblemEditorFields) => void;
  pending: boolean;
  onPendingChange: (value: boolean) => void;
  onPremisePendingChange: (value: boolean) => void;
  disabled: boolean;
}) {
  const definition = fields.truthTree;
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reference = definition.referenceTree;
  const mismatch = reference !== null && !truthTreeInitialMatches(definition, reference);

  return (
    <div className="derivation-authoring proof-editor">
      <div hidden={authoringStep === 'reference'}>
        <ProofKeyboardGuide />
        <p className="help">
          Save an unfinished statement now. Publishing requires a verified reference for this exact
          argument.
        </p>
        <ProofPremisesEditor
          format="tree"
          premises={definition.premises}
          onPendingChange={onPremisePendingChange}
          onChange={(premises) => onChange({ ...fields, truthTree: { ...definition, premises } })}
        />
        <label>
          Conclusion
          <ProofFormulaInput
            maxLength={TRUTH_TREE_LIMITS.maxFormulaLength}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={definition.conclusion}
            onValueChange={(conclusion) =>
              onChange({ ...fields, truthTree: { ...definition, conclusion } })
            }
          />
        </label>
        <label>
          Reference explanation (optional)
          <textarea
            maxLength={5000}
            value={definition.explanation ?? ''}
            onChange={(event) =>
              onChange({
                ...fields,
                truthTree: { ...definition, explanation: event.target.value || null },
              })
            }
          />
        </label>
        <p className="help">
          The explanation is private until answer reveal. Statement edits preserve the reference;
          rebuild it explicitly if its starting formulas change.
        </p>
      </div>
      <div hidden={authoringStep !== 'reference'}>
        <TruthTreeSummary definition={definition} />
        {mismatch && (
          <p role="status">
            The reference starts from a different statement. Rebuild it from the current premises
            and negated conclusion before continuing.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          type="button"
          className="secondary"
          disabled={disabled || pending}
          onClick={() => setResetting(true)}
        >
          Rebuild reference tree
        </button>
        {reference ? (
          <TruthTreeEditor
            statement={definition}
            disabled={disabled || mismatch}
            tree={reference}
            onPendingChange={onPendingChange}
            onChange={(referenceTree) =>
              onChange({ ...fields, truthTree: { ...definition, referenceTree } })
            }
          />
        ) : (
          <p>No reference tree.</p>
        )}
        <LocalTruthTreeCheck definition={definition} disabled={disabled || pending} />
      </div>
      {resetting && (
        <ProofDeletionPrompt
          modal
          label="Rebuild reference tree?"
          onCancel={() => setResetting(false)}
        >
          <p>
            Discard the entire reference and start with the current premises and negated conclusion.
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              try {
                onChange({
                  ...fields,
                  truthTree: { ...definition, referenceTree: initialTruthTree(definition) },
                });
                setResetting(false);
                setError(null);
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : 'Could not rebuild the reference.',
                );
                setResetting(false);
              }
            }}
          >
            Rebuild reference
          </button>
          <button type="button" className="secondary" onClick={() => setResetting(false)}>
            Keep reference
          </button>
        </ProofDeletionPrompt>
      )}
    </div>
  );
}
