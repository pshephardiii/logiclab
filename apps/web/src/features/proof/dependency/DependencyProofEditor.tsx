import { useEffect, useRef, useState } from 'react';
import { PROOF_LIMITS, type DependencyProof, type DependencyProofStep } from '@logiclab/contracts';
import { ProofChoice } from '../components/ProofChoice';
import { DependencyProofLine } from './DependencyProofLine';
import { DependencyProofSummary } from './DependencyProofSummary';
import { DependencyProofDisplay } from './DependencyProofDisplay';
import {
  startDependencyProof,
  uniqueDependencyIds,
  insertDependencyStep,
  moveDependencyStep,
  removeDependencyStep,
} from './editor';
import '../proof.css';

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
  const selectedIndex = proof
    ? Math.max(
        0,
        proof.steps.findIndex((step) => step.id === selectedId),
      )
    : 0;
  const selected = proof?.steps[selectedIndex];
  const [entry, setEntry] = useState<{
    base: DependencyProof;
    draft: DependencyProof;
    index: number;
  } | null>(null);
  const pending = entry !== null;
  const entryFields = useRef<HTMLElement>(null);
  const entryTrigger = useRef<HTMLButtonElement | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    onPendingChange?.(pending);
    return () => onPendingChange?.(false);
  }, [pending, onPendingChange]);

  useEffect(() => {
    if (pending) entryFields.current?.querySelector<HTMLInputElement>('input')?.focus();
    else entryTrigger.current?.focus();
  }, [pending]);

  const [deletion, setDeletion] = useState<{ kind: 'line'; id: string } | { kind: 'proof' } | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);

  function change(next: DependencyProof | null) {
    setDeletion(null);
    setError(null);
    onChange(next);
  }

  function insert(kind: DependencyProofStep['kind']) {
    if (!proof || entry) return;

    try {
      const index =
        before === null ? proof.steps.length : proof.steps.findIndex((step) => step.id === before);
      const next = insertDependencyStep(proof, index, kind);

      setDeletion(null);
      setError(null);
      setEntry({ base: proof, draft: next, index });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not insert a proof line.');
    }
  }

  function addLine() {
    if (!entry) return;

    // An external replacement must never be overwritten by an entry based on older work.
    if (proof !== entry.base) {
      setError('The proof changed while this entry was open. Discard entry and try again.');
      return;
    }

    setSelectedId(entry.draft.steps[entry.index]!.id);
    change(entry.draft);
    setAnnouncement(`Line ${entry.index + 1} added. This does not check correctness.`);
    setEntry(null);
  }

  return (
    <section
      className="proof-editor"
      aria-label={reference ? 'Reference proof editor' : 'Student proof editor'}
    >
      <h3>{heading}</h3>
      <details>
        <summary>How dependency proofs work</summary>
        <p className="help">
          Dependency proofs use explicit source sets and assumption/conclusion discharge pairs. Line
          numbers are display positions; references retain their identity through moves. Removing a
          line leaves references unresolved. A final conclusion must have no temporary-assumption
          dependencies.
        </p>
      </details>
      {!proof ? (
        <>
          <p>
            {reference ? 'No reference proof yet.' : 'No proof started yet.'} Starting copies the
            current premises once; later statement edits do not rewrite them.
          </p>
          <button
            type="button"
            onClick={() => {
              setBefore(null);
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
          {!uniqueDependencyIds(proof) ? (
            <>
              <p className="error" role="alert">
                This proof has duplicate identities. Structural editing is disabled; remove it
                explicitly to start fresh.
              </p>
              <DependencyProofSummary proof={proof} rules={statement.rules} label={heading} />
            </>
          ) : (
            <>
              <DependencyProofDisplay
                proof={proof}
                rules={statement.rules}
                selectedId={selected?.id ?? null}
                disabled={pending}
                onEdit={(id) => {
                  setSelectedId(id);
                  setDeletion(null);
                }}
              />
              <fieldset disabled={pending}>
                <h4>New line</h4>
                <ProofChoice
                  label="Insert before"
                  value={before}
                  empty="Append at end"
                  choices={proof.steps.map((step, index) => ({
                    id: step.id,
                    label: `${index + 1}. ${step.formula || '(blank)'}`,
                  }))}
                  onChange={(id) => {
                    setBefore(id);
                    setDeletion(null);
                  }}
                />
                <div className="action-row">
                  {(['premise', 'assumption', 'inference'] as const).map((kind) => (
                    <button
                      type="button"
                      key={kind}
                      disabled={proof.steps.length >= PROOF_LIMITS.maxSteps}
                      onClick={(event) => {
                        entryTrigger.current = event.currentTarget;
                        insert(kind);
                      }}
                    >
                      New {kind} line
                    </button>
                  ))}
                </div>
              </fieldset>
              {entry && (
                <section ref={entryFields} aria-label="Unconfirmed proof entry">
                  <p role="status">
                    This line has not been added. Add line or Discard entry before checking, saving,
                    previewing or submitting.
                  </p>
                  <DependencyProofLine
                    proof={entry.draft}
                    index={entry.index}
                    statement={statement}
                    purpose={purpose}
                    onChange={(next) =>
                      setEntry({
                        ...entry,
                        draft: {
                          ...entry.draft,
                          steps: entry.draft.steps.map((step, index) =>
                            index === entry.index ? next : step,
                          ),
                        },
                      })
                    }
                  />
                  <div className="action-row">
                    <button type="button" onClick={addLine}>
                      Add line
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setEntry(null);
                        setError(null);
                        setAnnouncement('Entry discarded. The entered proof is unchanged.');
                      }}
                    >
                      Discard entry
                    </button>
                  </div>
                </section>
              )}
              <p className="help" aria-live="polite">
                {announcement}
              </p>
              {!entry && selected && (
                <DependencyProofLine
                  key={selected.id}
                  proof={proof}
                  index={selectedIndex}
                  statement={statement}
                  purpose={purpose}
                  onChange={(next) =>
                    change({
                      ...proof,
                      steps: proof.steps.map((value, position) =>
                        position === selectedIndex ? next : value,
                      ),
                    })
                  }
                  onMove={(delta) => {
                    setSelectedId(selected.id);
                    change(moveDependencyStep(proof, selectedIndex, delta));
                  }}
                  onDelete={() => setDeletion({ kind: 'line', id: selected.id })}
                />
              )}
            </>
          )}
          <button
            type="button"
            className="secondary"
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
                    change(null);
                  } else {
                    const index = proof.steps.findIndex((step) => step.id === deletion.id);

                    if (before === deletion.id) setBefore(null);

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
