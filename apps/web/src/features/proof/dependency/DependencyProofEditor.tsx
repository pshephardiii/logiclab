import { DependencyRangeDeletionDialog } from './DependencyRangeDeletionDialog';
import type { ReactNode } from 'react';
import { dependencyEntryRequirement } from './entry-requirements';
import { createDependencyDischargeEntry } from './discharge-entry';
import { proofNotation } from '../helpers/proof-notation';
import { ProofDeletionPrompt } from '../components/ProofDeletionPrompt';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PROOF_LIMITS, type DependencyProof, type DependencyProofStep } from '@logiclab/contracts';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';
import { DependencyProofLine } from './DependencyProofLine';
import { DependencyProofSummary } from './DependencyProofSummary';
import { DependencyProofDisplay } from './DependencyProofDisplay';
import { ProofRuleHelp } from '../reference/ProofRuleHelp';
import { ProofHelp } from '../reference/ProofHelp';
import { ProofEditorHeading } from '../components/ProofEditorHeading';
import {
  startDependencyProof,
  uniqueDependencyIds,
  insertDependencyStep,
  moveDependencyStep,
} from './editor';
import '../proof.css';

type Entry = { base: DependencyProof; draft: DependencyProof; index: number };

export function DependencyProofEditor({
  statement,
  proof,
  onChange,
  purpose = 'reference',
  onPendingChange,
  conclusionActions,
  onPremiseChange,
  actions,
}: {
  statement: {
    premises: { id: string; formula: string }[];
    rules: { id: string; label: string }[];
    conclusion?: string;
  };
  proof: DependencyProof | null;
  purpose?: 'reference' | 'student';
  onChange: (proof: DependencyProof | null) => void;
  onPendingChange?: (pending: boolean) => void;
  conclusionActions?: ReactNode;
  actions?: ReactNode;
  onPremiseChange?: (premiseId: string, formula: string) => void;
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
  const [deletion, setDeletion] = useState<{ kind: 'proof' } | null>(null);
  const [rangeStart, setRangeStart] = useState<{ id: string; base: DependencyProof } | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
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

  useEffect(() => {
    if (!rangeStart || rangeEnd) return;
    editor.current
      ?.querySelector<HTMLButtonElement>('button[data-proof-range][aria-pressed="true"]')
      ?.focus();
  }, [rangeStart, rangeEnd]);

  function change(next: DependencyProof | null) {
    setDeletion(null);
    setRangeStart(null);
    setRangeEnd(null);
    setError(null);
    onChange(next);
  }

  function cancelRange() {
    setRangeStart(null);
    setRangeEnd(null);
    setError(null);
  }

  function selectRange(id: string) {
    if (!proof || pending || !safe) return;
    if (rangeStart && rangeStart.base !== proof) {
      setError('The proof changed. Cancel the selection and choose the lines again.');
      return;
    }
    setSelectedId(null);
    setBefore(null);
    setDeletion(null);
    if (rangeStart) setRangeEnd(id);
    else {
      setRangeStart({ id, base: proof });
      setError(null);
    }
  }

  function changeLine(next: DependencyProofStep) {
    if (selected && !entry && proof) {
      change({
        ...proof,
        steps: proof.steps.map((step) => (step.id === selected.id ? next : step)),
      });
      if (
        selected.kind === 'premise' &&
        next.kind === 'premise' &&
        selected.premiseId &&
        next.premiseId === selected.premiseId &&
        next.formula !== selected.formula
      ) {
        onPremiseChange?.(selected.premiseId, next.formula);
      }
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

  function dischargeAssumption(id: string) {
    if (!proof || !idle || pending) return;
    const next = createDependencyDischargeEntry(proof, statement.rules, id);
    if (!next) return;

    setSelectedId(null);
    setBefore(null);
    setEntry(next);
    focusRequested.current = true;
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
    const requirement = dependencyEntryRequirement(current.draft, current.index, statement.rules);
    if (requirement) {
      setError(requirement);
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
      <ProofEditorHeading
        title={heading}
        goal={statement.conclusion}
        goalActions={conclusionActions}
      />
      <ProofHelp format="dependency" rules={statement.rules} />
      {!proof ? (
        <>
          {!reference && statement.premises.length > 0 && (
            <section aria-label="Starting premises">
              <h4>Premises</h4>
              <ol>
                {statement.premises.map((premise) => (
                  <li key={premise.id}>
                    <code>{proofNotation(premise.formula)}</code>
                  </li>
                ))}
              </ol>
            </section>
          )}
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
              {rangeStart ? (
                <div className="dependency-range-instructions">
                  <p role="status">
                    Line {proof.steps.findIndex((step) => step.id === rangeStart.id) + 1 || '?'}{' '}
                    selected. Select the line number at the other end of the range.
                  </p>
                  <button type="button" className="secondary" onClick={cancelRange}>
                    Cancel selection
                  </button>
                </div>
              ) : (
                <p className="help">
                  To delete several lines, select the first and last line numbers.
                </p>
              )}
              <DependencyProofDisplay
                proof={proof}
                rules={statement.rules}
                selectedId={selected?.id ?? null}
                disabled={pending || rangeStart !== null}
                onRangeSelect={selectRange}
                rangeDisabled={pending}
                rangeStartId={rangeStart?.id}
                rangeEndId={rangeEnd ?? undefined}
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
                onDelete={(id) => {
                  setRangeStart({ id, base: proof });
                  setRangeEnd(id);
                  setSelectedId(null);
                  setBefore(null);
                }}
                onDischarge={
                  idle &&
                  statement.rules.some((rule) => getPropositionalRule(rule.id)?.subproofReferences)
                    ? dischargeAssumption
                    : undefined
                }
                entryLabel={
                  pending
                    ? 'Unconfirmed proof entry'
                    : selected
                      ? 'Edit proof line'
                      : 'New proof line'
                }
                entry={
                  !rangeStart && fieldsProof && fieldsIndex !== undefined && fieldsStep ? (
                    <DependencyProofLine
                      key={fieldsStep.id}
                      proof={fieldsProof}
                      index={fieldsIndex}
                      statement={statement}
                      allowKindChange={!selected}
                      fixedPremiseSource={Boolean(onPremiseChange)}
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
          <div className="dependency-proof-actions">
            {(reference || !safe) && (
              <button
                type="button"
                className="text-button"
                disabled={pending || rangeStart !== null}
                onClick={() => setDeletion({ kind: 'proof' })}
              >
                {reference ? 'Remove reference proof' : 'Remove proof'}
              </button>
            )}
            {actions}
          </div>
          {rangeStart && rangeEnd && (
            <DependencyRangeDeletionDialog
              proof={rangeStart.base}
              currentProof={proof}
              from={rangeStart.id}
              to={rangeEnd}
              onCancel={cancelRange}
              onConfirm={(next) => {
                setSelectedId(null);
                setBefore(null);
                change(next);
                focusRequested.current = true;
              }}
            />
          )}
          {deletion && (
            <ProofDeletionPrompt
              modal
              label="Confirm proof deletion"
              onCancel={() => setDeletion(null)}
            >
              <p>{reference ? 'Remove the entire reference proof?' : 'Remove the entire proof?'}</p>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setBefore(null);
                  setSelectedId(null);
                  change(null);
                }}
              >
                Confirm deletion
              </button>
              <button type="button" className="secondary" onClick={() => setDeletion(null)}>
                Keep proof
              </button>
            </ProofDeletionPrompt>
          )}
        </>
      )}
    </section>
  );
}
