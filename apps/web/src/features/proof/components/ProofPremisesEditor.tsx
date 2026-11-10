import { useEffect, useState } from 'react';
import type { DependencyProof } from '@logiclab/contracts';
import { PROOF_LIMITS } from '@logiclab/contracts';
import { DependencyProofDisplay } from '../dependency/DependencyProofDisplay';
import { ProofFormulaInput } from './ProofFormulaInput';
import { ProofDeletionPrompt } from './ProofDeletionPrompt';

type Premise = { id: string; formula: string };

/** Confirmed statement premises share the proof layout; an untouched input is never a premise. */
export function ProofPremisesEditor({
  premises,
  onChange,
  onPendingChange,
}: {
  premises: Premise[];
  onChange: (premises: Premise[]) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [formula, setFormula] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const pending = editing !== null || formula.length > 0;
  const index = editing ? premises.findIndex((premise) => premise.id === editing) : premises.length;
  const proof: DependencyProof = {
    proofVersion: 1,
    format: 'dependency',
    steps: premises.map((premise) => ({
      kind: 'premise',
      id: premise.id,
      premiseId: premise.id,
      formula: premise.formula,
      dependencies: [premise.id],
    })),
  };

  useEffect(() => {
    onPendingChange?.(pending);
    return () => onPendingChange?.(false);
  }, [pending, onPendingChange]);

  function discard() {
    setFormula('');
    setEditing(null);
  }

  function confirm() {
    if (!formula.trim() || index < 0 || (!editing && premises.length >= PROOF_LIMITS.maxPremises))
      return;
    onChange(
      editing
        ? premises.map((premise) => (premise.id === editing ? { ...premise, formula } : premise))
        : [...premises, { id: crypto.randomUUID(), formula }],
    );
    discard();
  }

  return (
    <section aria-label="Starting premises" className="proof-setup-premises">
      <h3>
        Premises <span className="help">(optional)</span>
      </h3>
      <DependencyProofDisplay
        proof={proof}
        rules={[]}
        label="Problem premise diagram"
        selectedId={editing}
        disabled={pending}
        onEdit={(id) => {
          setEditing(id);
          setFormula(premises.find((premise) => premise.id === id)!.formula);
        }}
        onMove={(at, delta) => {
          const next = [...premises];
          [next[at], next[at + delta]] = [next[at + delta]!, next[at]!];
          onChange(next);
        }}
        onDelete={setDeleting}
        allowInsert={false}
        entryLabel="Premise entry"
        entry={
          <tr
            className="dependency-entry-row"
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.nativeEvent.isComposing &&
                event.target instanceof HTMLInputElement
              ) {
                event.preventDefault();
                confirm();
              }
            }}
          >
            <td className="proof-line-dependencies">{`{${index + 1}}`}</td>
            <th className="proof-line-number" scope="row">
              {index + 1}
            </th>
            <td className="proof-line-formula">
              <ProofFormulaInput
                aria-label={editing ? `Premise ${index + 1}` : 'New premise'}
                placeholder="Premise"
                value={formula}
                maxLength={PROOF_LIMITS.maxFormulaLength}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                onValueChange={setFormula}
              />
            </td>
            <td className="proof-line-justification">{editing ? 'Edit premise' : 'New premise'}</td>
            <td className="proof-line-action dependency-entry-actions">
              <button
                type="button"
                disabled={
                  !formula.trim() || (!editing && premises.length >= PROOF_LIMITS.maxPremises)
                }
                onClick={confirm}
              >
                {editing ? 'Update premise' : 'Add premise'}
              </button>
              {pending && (
                <button type="button" className="text-button" onClick={discard}>
                  Discard premise
                </button>
              )}
            </td>
          </tr>
        }
      />
      {deleting && (
        <ProofDeletionPrompt modal label="Delete premise?" onCancel={() => setDeleting(null)}>
          <p>
            Remove this premise from the problem statement? Existing reference steps will need
            review.
          </p>
          <button
            type="button"
            className="danger"
            onClick={() => {
              onChange(premises.filter((premise) => premise.id !== deleting));
              setDeleting(null);
            }}
          >
            Delete premise
          </button>
          <button type="button" className="secondary" onClick={() => setDeleting(null)}>
            Keep premise
          </button>
        </ProofDeletionPrompt>
      )}
    </section>
  );
}
