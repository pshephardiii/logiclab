import { useEffect, useState } from 'react';
import type { DependencyProof, FitchProof } from '@logiclab/contracts';
import { PROOF_LIMITS } from '@logiclab/contracts';
import { FitchProofDisplay } from './FitchProofDisplay';
import { DependencyProofDisplay } from '../dependency/DependencyProofDisplay';
import { ProofFormulaInput } from './ProofFormulaInput';
import { ProofDeletionPrompt } from './ProofDeletionPrompt';

type Premise = { id: string; formula: string };

/** Confirmed statement premises share the proof layout; an untouched input is never a premise. */
export function ProofPremisesEditor({
  premises,
  format = 'dependency',
  onChange,
  onPendingChange,
}: {
  premises: Premise[];
  format?: 'dependency' | 'fitch';
  onChange: (premises: Premise[]) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [formula, setFormula] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const pending = editing !== null || formula.length > 0;
  const index = editing ? premises.findIndex((premise) => premise.id === editing) : premises.length;
  const proof: DependencyProof | FitchProof =
    format === 'fitch'
      ? {
          proofVersion: 1,
          format,
          blocks: [],
          steps: premises.map((premise) => ({
            kind: 'premise',
            id: premise.id,
            premiseId: premise.id,
            formula: premise.formula,
            blockId: null,
          })),
        }
      : {
          proofVersion: 1,
          format,
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

  const displayProps = {
    rules: [],
    label: 'Problem premise diagram',
    selectedId: editing,
    disabled: pending,
    onEdit: (id: string) => {
      setEditing(id);
      setFormula(premises.find((premise) => premise.id === id)!.formula);
    },
    onMove: (at: number, delta: -1 | 1) => {
      const next = [...premises];
      [next[at], next[at + delta]] = [next[at + delta]!, next[at]!];
      onChange(next);
    },
    onDelete: setDeleting,
    entryLabel: 'Premise entry',
    entry: (
      <tr
        className={format === 'fitch' ? 'fitch-entry-row' : 'dependency-entry-row'}
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
        {format === 'dependency' && <td className="proof-line-dependencies">{`{${index + 1}}`}</td>}
        <th className={format === 'fitch' ? 'fitch-line-number' : 'proof-line-number'} scope="row">
          {index + 1}
        </th>
        <td className={format === 'fitch' ? 'fitch-line-formula' : 'proof-line-formula'}>
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
        <td
          className={format === 'fitch' ? 'fitch-line-justification' : 'proof-line-justification'}
        >
          {editing ? 'Edit premise' : 'New premise'}
        </td>
        <td
          className={
            format === 'fitch'
              ? 'fitch-entry-actions'
              : 'proof-line-action dependency-entry-actions'
          }
        >
          <button
            type="button"
            disabled={!formula.trim() || (!editing && premises.length >= PROOF_LIMITS.maxPremises)}
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
    ),
  };

  return (
    <section aria-label="Starting premises" className="proof-setup-premises">
      <h3>
        Premises <span className="help">(optional)</span>
      </h3>
      {proof.format === 'fitch' ? (
        <FitchProofDisplay {...displayProps} proof={proof} />
      ) : (
        <DependencyProofDisplay {...displayProps} proof={proof} allowInsert={false} />
      )}
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
