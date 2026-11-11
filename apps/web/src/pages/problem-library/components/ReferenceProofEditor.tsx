import { useState } from 'react';
import { referencePremisesMatch } from '../helpers/reference-premises';
import { withFreshReference } from '../helpers/fresh-reference';
import { treeReferenceStatementMatches } from '../helpers/tree-reference-statement';
import { ProofDeletionPrompt } from '../../../features/proof/components/ProofDeletionPrompt';
import type { AuthoringDerivationDefinition } from '../helpers/problem-editor';
import { FitchProofEditor } from '../../../features/proof/components/FitchProofEditor';
import { DependencyProofEditor } from '../../../features/proof/dependency/DependencyProofEditor';
import { TreeProofEditor } from '../../../features/proof/tree/TreeProofEditor';

/** Private definition stays at the authoring boundary; controls receive no explanation/key. */
export function ReferenceProofEditor({
  definition,
  onChange,
  onPendingChange,
  disabled = false,
}: {
  definition: AuthoringDerivationDefinition;
  onChange: (definition: AuthoringDerivationDefinition) => void;
  onPendingChange?: (pending: boolean) => void;
  disabled?: boolean;
}) {
  const [resetting, setResetting] = useState(false);
  const matches =
    definition.format === 'tree'
      ? treeReferenceStatementMatches(definition)
      : referencePremisesMatch(definition);

  return (
    <>
      {!matches && (
        <section
          className="reference-premise-warning"
          aria-label={
            definition.format === 'tree'
              ? 'Reference statement mismatch'
              : 'Reference premise mismatch'
          }
        >
          <p>
            {definition.format === 'tree'
              ? 'The reference has a different conclusion or outdated premise leaves. Review the tree or restart it from the current statement.'
              : 'The reference starting premises differ from the statement. Review the premise lines or restart the reference from the current statement.'}
          </p>
          <button
            type="button"
            className="secondary"
            disabled={disabled}
            onClick={() => setResetting(true)}
          >
            Restart reference from statement
          </button>
        </section>
      )}
      {resetting && (
        <ProofDeletionPrompt
          modal
          label="Restart reference proof?"
          onCancel={() => setResetting(false)}
        >
          <p>
            {definition.format === 'tree'
              ? 'This replaces the entire reference with a new unverified conclusion root. All existing nodes and discharge selections will be removed.'
              : 'This replaces the entire reference proof with the current starting premises. All derived lines and assumptions will be removed.'}
          </p>
          <button
            type="button"
            className="danger"
            onClick={() => {
              onChange(withFreshReference(definition));
              setResetting(false);
            }}
          >
            Restart reference
          </button>
          <button type="button" className="secondary" onClick={() => setResetting(false)}>
            Keep reference
          </button>
        </ProofDeletionPrompt>
      )}
      {definition.format === 'tree' ? (
        <TreeProofEditor
          key="tree"
          onPendingChange={onPendingChange}
          statement={definition}
          proof={definition.referenceProof}
          onChange={(referenceProof) => onChange({ ...definition, referenceProof })}
        />
      ) : definition.format === 'dependency' ? (
        <DependencyProofEditor
          onPendingChange={onPendingChange}
          key="dependency"
          statement={definition}
          proof={definition.referenceProof}
          onChange={(referenceProof) => onChange({ ...definition, referenceProof })}
        />
      ) : (
        <FitchProofEditor
          onPendingChange={onPendingChange}
          key="fitch"
          statement={definition}
          proof={definition.referenceProof}
          purpose="reference"
          onChange={(referenceProof) => onChange({ ...definition, referenceProof })}
        />
      )}
    </>
  );
}
