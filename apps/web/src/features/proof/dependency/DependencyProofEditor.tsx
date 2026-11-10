import { useEffect, useMemo, useRef, useState } from 'react';
import { PROOF_LIMITS, type DependencyProof, type DependencyProofStep } from '@logiclab/contracts';
import { DependencyProofLine } from './DependencyProofLine';
import { DependencyProofSummary } from './DependencyProofSummary';
import { DependencyProofDisplay } from './DependencyProofDisplay';
import { ProofRuleHelp } from '../reference/ProofRuleHelp';
import { ProofHelp } from '../reference/ProofHelp';
import {
  startDependencyProof,
  uniqueDependencyIds,
  insertDependencyStep,
  moveDependencyStep,
  removeDependencyStep,
} from './editor';
import '../proof.css';

type Entry = { base: DependencyProof; draft: DependencyProof; index: number };

export function DependencyProofEditor({
  statement,
  proof,
  onChange,
  purpose = 'reference',
  onPendingChange,
}: {
  statement: {
    premises: { id: string; formula: string }[];
    rules: { id: string; label: string }[];
  };
  proof: DependencyProof | null;
  purpose?: 'reference' | 'student';
  onChange: (proof: DependencyProof | null) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const reference = purpose === 'reference';
  const heading = reference ? 'Reference proof' : 'Your proof';
  const [before, setBefore] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = proof?.steps.findIndex((step) => step.id === selectedId) ?? -1;
  const selected = proof?.steps[selectedIndex];
  const [entry, setEntry] = useState<Entry | null>(null);
  const pending = entry !== null;
  const safe = proof ? uniqueDependencyIds(proof) : true;
  const editor = useRef<HTMLElement>(null);
  const focusRequested = useRef(false);
  const [announcement, setAnnouncement] = useState('');
  const [deletion, setDeletion] = useState<{ kind: 'line'; id: string } | { kind: 'proof' } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // The untouched next row is only a visual draft. It does not dirty or extend the proof.
  const idle = useMemo<Entry | null>(() => {
    if (!proof || !safe || proof.steps.length >= PROOF_LIMITS.maxSteps) return null;
    const found = proof.steps.findIndex((step) => step.id === before);
    const index = found < 0 ? proof.steps.length : found;
    return { base: proof, draft: insertDependencyStep(proof, index, 'inference'), index };
  }, [proof, safe, before]);
  const current = entry ?? idle;
  const fieldsProof = selected && !entry ? proof : current?.draft;
  const fieldsIndex = selected && !entry ? selectedIndex : current?.index;
  const fieldsStep =
    fieldsProof && fieldsIndex !== undefined ? fieldsProof.steps[fieldsIndex] : undefined;

  useEffect(() => {
    onPendingChange?.(pending);
    return () => onPendingChange?.(false);
  }, [pending, onPendingChange]);

  useEffect(() => {
    if (!focusRequested.current) return;
    editor.current?.querySelector<HTMLInputElement>('input[data-proof-formula]')?.focus();
    focusRequested.current = false;
  });

  function change(next: DependencyProof | null) {
    setDeletion(null);
    setError(null);
    onChange(next);
  }

  function changeLine(next: DependencyProofStep) {
    if (selected && !entry && proof) {
      change({
        ...proof,
        steps: proof.steps.map((step) => (step.id === selected.id ? next : step)),
      });
    } else if (current) {
      setEntry({
        ...current,
        draft: {
          ...current.draft,
          steps: current.draft.steps.map((step, index) => (index === current.index ? next : step)),
        },
      });
      setDeletion(null);
      setError(null);
    }
  }

  function discardEntry() {
    setEntry(null);
    setBefore(null);
    setError(null);
    focusRequested.current = true;
    setAnnouncement('Entry discarded.');
  }

  function confirmLine() {
    if (selected && !entry) {
      setSelectedId(null);
      focusRequested.current = true;
      return;
    }
    if (!current) return;

    // Do not overwrite a reload or authoritative replacement with a draft based on older work.
    if (proof !== current.base) {
      setError('The proof changed while this entry was open. Discard entry and try again.');
      return;
    }
    change(current.draft);
    setSelectedId(null);
    setEntry(null);
    setBefore(null);
    focusRequested.current = true;
    setAnnouncement(`Line ${current.index + 1} added.`);
  }

  return (
    <section
      ref={editor}
      className="proof-editor dependency-editor"
      aria-label={reference ? 'Reference proof editor' : 'Student proof editor'}
    >
      <h3>{heading}</h3>
      <ProofHelp format="dependency" rules={statement.rules} />
      {!proof ? (
        <>
          <button
            type="button"
            onClick={() => {
              setBefore(null);
              focusRequested.current = true;
              change(startDependencyProof(statement.premises));
            }}
          >
            {reference ? 'Start reference proof' : 'Start proof'}
          </button>
        </>
      ) : (
        <>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {!safe ? (
            <>
              <p className="error" role="alert">
                This proof has duplicate identities. Structural editing is disabled; remove it
                explicitly to start fresh.
              </p>
              <DependencyProofSummary proof={proof} rules={statement.rules} label={heading} />
              {pending && (
                <button type="button" className="secondary" onClick={discardEntry}>
                  Discard entry
                </button>
              )}
            </>
          ) : (
            <>
              <DependencyProofDisplay
                proof={proof}
                rules={statement.rules}
                selectedId={selected?.id ?? null}
                disabled={pending}
                onEdit={(id) => {
                  if (selectedId === id) {
                    editor.current
                      ?.querySelector<HTMLInputElement>('input[data-proof-formula]')
                      ?.focus();
                  }
                  setSelectedId(id);
                  setBefore(null);
                  setDeletion(null);
                  focusRequested.current = true;
                }}
                onMove={(index, delta) => change(moveDependencyStep(proof, index, delta))}
                onInsert={(id) => {
                  setSelectedId(null);
                  setBefore(id);
                  setDeletion(null);
                  focusRequested.current = true;
                }}
                onDelete={(id) => setDeletion({ kind: 'line', id })}
                entryLabel={
                  pending
                    ? 'Unconfirmed proof entry'
                    : selected
                      ? 'Edit proof line'
                      : 'New proof line'
                }
                entry={
                  fieldsProof && fieldsIndex !== undefined && fieldsStep ? (
                    <DependencyProofLine
                      key={fieldsStep.id}
                      proof={fieldsProof}
                      index={fieldsIndex}
                      statement={statement}
                      allowKindChange={!selected}
                      pending={pending}
                      onChange={changeLine}
                      onConfirm={confirmLine}
                      onDiscard={discardEntry}
                    />
                  ) : undefined
                }
              />
              {before && !pending && (
                <button type="button" className="text-button" onClick={() => setBefore(null)}>
                  Append at end instead
                </button>
              )}
              {!idle && !selected && (
                <p role="status">Proof line limit reached. Edit or remove an existing line.</p>
              )}
              <details className="dependency-input-guide">
                <summary>Input guide</summary>
                <table className="proof-reference-table">
                  <tbody>
                    <tr>
                      <th scope="row">Dependencies</th>
                      <td>Select supporting premise/assumption lines. ∅ means none.</td>
                    </tr>
                    <tr>
                      <th scope="row">Number</th>
                      <td>Assigned automatically.</td>
                    </tr>
                    <tr>
                      <th scope="row">Formula</th>
                      <td>
                        Type your formula. Use <kbd>_|_</kbd> for ⊥.
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Rule</th>
                      <td>Choose an enabled rule or Assumption.</td>
                    </tr>
                    <tr>
                      <th scope="row">Citations</th>
                      <td>Select earlier lines, or assumption/end pairs for discharge.</td>
                    </tr>
                    <tr>
                      <th scope="row">Confirm</th>
                      <td>
                        Add line or Enter in the formula field. Save and Check remain separate.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </details>
              {fieldsStep?.kind === 'inference' && (
                <ProofRuleHelp
                  format="dependency"
                  rules={statement.rules}
                  ruleId={fieldsStep.ruleId}
                />
              )}
              <span className="proof-control-label" aria-live="polite">
                {announcement}
              </span>
            </>
          )}
          <button
            type="button"
            className="text-button"
            disabled={pending}
            onClick={() => setDeletion({ kind: 'proof' })}
          >
            {reference ? 'Remove reference proof' : 'Clear proof'}
          </button>
          {deletion && (
            <div role="group" aria-label="Confirm proof deletion">
              <p>
                {deletion.kind === 'proof'
                  ? reference
                    ? 'Remove the entire reference proof?'
                    : 'Clear the entire proof?'
                  : 'Delete this line? Citations and dependency sets referring to it will need repair.'}
              </p>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (deletion.kind === 'proof') {
                    setBefore(null);
                    setSelectedId(null);
                    change(null);
                  } else {
                    const index = proof.steps.findIndex((step) => step.id === deletion.id);
                    if (before === deletion.id) setBefore(null);
                    if (selectedId === deletion.id) setSelectedId(null);
                    change(removeDependencyStep(proof, index));
                  }
                }}
              >
                Confirm deletion
              </button>
              <button type="button" className="secondary" onClick={() => setDeletion(null)}>
                Keep proof
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
