import { useState } from 'react';
import { PROOF_LIMITS, type DependencyProof, type DependencyProofStep } from '@logiclab/contracts';
import { ProofChoice } from '../components/ProofChoice';
import { DependencyProofLine } from './DependencyProofLine';
import { DependencyProofSummary } from './DependencyProofSummary';
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
}: {
  statement: {
    premises: { id: string; formula: string }[];
    rules: { id: string; label: string }[];
  };
  proof: DependencyProof | null;
  onChange: (proof: DependencyProof | null) => void;
}) {
  const [before, setBefore] = useState<string | null>(null);
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
    if (!proof) return;
    try {
      change(
        insertDependencyStep(
          proof,
          before === null
            ? proof.steps.length
            : proof.steps.findIndex((step) => step.id === before),
          kind,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not insert a proof line.');
    }
  }
  return (
    <section className="proof-editor" aria-label="Reference proof editor">
      <h3>Reference proof</h3>
      <p className="help">
        Dependency proofs use explicit source sets and assumption/conclusion discharge pairs. Line
        numbers are display positions; references retain their identity through moves. Removing a
        line leaves references unresolved. A final conclusion must have no temporary-assumption
        dependencies.
      </p>
      {!proof ? (
        <>
          <p>
            No reference proof yet. Starting copies the current premises once; later statement edits
            do not rewrite them.
          </p>
          <button
            type="button"
            onClick={() => {
              setBefore(null);
              change(startDependencyProof(statement.premises));
            }}
          >
            Start reference proof
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
              <DependencyProofSummary
                proof={proof}
                rules={statement.rules}
                label="Reference proof"
              />
            </>
          ) : (
            <>
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
                    onClick={() => insert(kind)}
                  >
                    Add {kind} line
                  </button>
                ))}
              </div>
              {proof.steps.map((step, index) => (
                <DependencyProofLine
                  key={step.id}
                  proof={proof}
                  index={index}
                  statement={statement}
                  onChange={(next) =>
                    change({
                      ...proof,
                      steps: proof.steps.map((value, position) =>
                        position === index ? next : value,
                      ),
                    })
                  }
                  onMove={(delta) => change(moveDependencyStep(proof, index, delta))}
                  onDelete={() => setDeletion({ kind: 'line', id: step.id })}
                />
              ))}
            </>
          )}
          <button
            type="button"
            className="secondary"
            onClick={() => setDeletion({ kind: 'proof' })}
          >
            Remove reference proof
          </button>
          {deletion && (
            <div role="group" aria-label="Confirm proof deletion">
              <p>
                {deletion.kind === 'proof'
                  ? 'Remove the entire reference proof?'
                  : 'Delete this line? Citations and dependency sets referring to it will need repair.'}
              </p>
              <button
                type="button"
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
