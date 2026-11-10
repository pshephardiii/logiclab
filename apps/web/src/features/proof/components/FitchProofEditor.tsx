import { FitchProofDeletionConfirmation } from './FitchProofDeletionConfirmation';
import { fitchEditorChoices } from '../helpers/proof-editor-choices';
import { FitchProofBlockControls } from './FitchProofBlockControls';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FitchProofDisplay } from './FitchProofDisplay';
import { PROOF_LIMITS, type FitchProof, type FitchProofStep } from '@logiclab/contracts';
import type { FitchDerivationContent } from '@logiclab/contracts/derivation';
import {
  startFitchProof,
  moveFitchProofStep,
  removeFitchProofStep,
  removeFitchSubproof,
  fitchProofSubtree,
  uniqueFitchProofIds,
  fitchProofDepth,
} from '../helpers/fitch-editor';
import { createFitchEntry, type FitchEntry } from '../helpers/fitch-entry';
import { FitchProofLine } from './FitchProofLine';
import { FitchProofEntry } from './FitchProofEntry';
import { FitchProofSummary } from './FitchProofSummary';
import { ProofChoice } from './ProofChoice';
import '../proof.css';
import { ProofHelp } from '../reference/ProofHelp';
import { ProofRuleHelp } from '../reference/ProofRuleHelp';
import { ProofEditorHeading } from './ProofEditorHeading';

type Props = {
  statement: Pick<FitchDerivationContent, 'premises' | 'rules'> & { conclusion?: string };
  proof: FitchProof | null;
  purpose: 'reference' | 'student';
  onChange: (proof: FitchProof | null) => void;
  onPendingChange?: (pending: boolean) => void;
};

type Deletion = { kind: 'line'; index: number } | { kind: 'block'; id: string } | { kind: 'proof' };

export function FitchProofEditor({ statement, proof, purpose, onChange, onPendingChange }: Props) {
  const reference = purpose === 'reference';
  const heading = reference ? 'Reference proof' : 'Your proof';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scope, setScope] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [entry, setEntry] = useState<FitchEntry | null>(null);
  const [deletion, setDeletion] = useState<Deletion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const editor = useRef<HTMLElement>(null);
  const focusRequested = useRef(false);
  const selectedIndex = proof?.steps.findIndex((step) => step.id === selectedId) ?? -1;
  const selected = proof?.steps[selectedIndex];
  const pending = entry !== null;
  const safe = !proof || uniqueFitchProofIds(proof);

  // An untouched row is a visual draft only. Invalid scopes remain available for repair.
  const idle = useMemo(() => {
    if (!proof || !safe || proof.steps.length >= PROOF_LIMITS.maxSteps) return null;

    try {
      return createFitchEntry(proof, before, scope);
    } catch {
      return null;
    }
  }, [proof, safe, before, scope]);
  const current = entry ?? idle;
  const entryStep = current?.draft.steps[current.index];

  useEffect(() => {
    onPendingChange?.(pending);
    return () => onPendingChange?.(false);
  }, [pending, onPendingChange]);

  useEffect(() => {
    if (!focusRequested.current) return;
    editor.current?.querySelector<HTMLInputElement>('input[data-proof-formula]')?.focus();
    focusRequested.current = false;
  });

  function change(next: FitchProof | null) {
    setDeletion(null);
    setError(null);
    onChange(next);
  }

  function discardEntry() {
    setEntry(null);
    setBefore(null);
    setError(null);
    focusRequested.current = true;
    setAnnouncement('Entry discarded.');
  }

  function changeEntry(next: FitchProofStep) {
    if (!current) return;

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

  function confirmEntry() {
    if (!current) return;

    // Never replace reloaded/authoritative work with an entry based on an older snapshot.
    if (proof !== current.base) {
      setError('The proof changed while this entry was open. Discard entry and try again.');
      return;
    }

    change(current.draft);
    if (entryStep?.kind === 'assumption') setScope(entryStep.blockId);
    setEntry(null);
    setBefore(null);
    focusRequested.current = true;
    setAnnouncement(`Line ${current.index + 1} added.`);
  }

  function openSubproof() {
    if (!proof || pending || selected) return;

    try {
      setEntry(createFitchEntry(proof, before, scope, true));
      setError(null);
      focusRequested.current = true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open a subproof.');
    }
  }

  const { lines, lineScopes, blockChoices } = fitchEditorChoices(
    proof ?? { proofVersion: 1, format: 'fitch', steps: [], blocks: [] },
  );
  const affected =
    proof && deletion?.kind === 'block' ? fitchProofSubtree(proof, deletion.id) : null;
  const deletedCount =
    affected && proof
      ? proof.steps.filter((step) => step.blockId && affected.has(step.blockId)).length
      : deletion?.kind === 'line'
        ? 1
        : (proof?.steps.length ?? 0);

  return (
    <section
      ref={editor}
      className="proof-editor"
      aria-label={reference ? 'Reference proof editor' : 'Student proof editor'}
    >
      <ProofEditorHeading title={heading} goal={statement.conclusion} />
      <ProofHelp format="fitch" rules={statement.rules} />
      {!proof && pending && (
        <p role="alert" className="error">
          The proof changed while this entry was open. Discard entry and try again.
          <button type="button" className="text-button" onClick={discardEntry}>
            Discard entry
          </button>
        </p>
      )}
      {!proof ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setScope(null);
            setBefore(null);
            setSelectedId(null);
            focusRequested.current = true;
            change(startFitchProof(statement));
          }}
        >
          {reference ? 'Start reference proof' : 'Start proof'}
        </button>
      ) : (
        <>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {!safe ? (
            <>
              <p role="alert" className="error">
                This proof has duplicate or colliding identities. Inspect it below or remove it
                explicitly to start fresh; structural editing is disabled.
              </p>
              <FitchProofSummary proof={proof} rules={statement.rules} label={heading} />
              {pending && (
                <button type="button" className="secondary" onClick={discardEntry}>
                  Discard entry
                </button>
              )}
            </>
          ) : (
            <>
              <FitchProofDisplay
                proof={proof}
                rules={statement.rules}
                selectedId={selected?.id ?? null}
                disabled={pending}
                onEdit={(id) => {
                  if (selectedId === id)
                    editor.current
                      ?.querySelector<HTMLInputElement>('input[data-proof-formula]')
                      ?.focus();
                  setSelectedId(id);
                  setDeletion(null);
                  focusRequested.current = true;
                }}
                entryLabel={pending ? 'Unconfirmed proof entry' : 'New proof line'}
                entry={
                  !selected && current ? (
                    <FitchProofEntry
                      key={entryStep!.id}
                      proof={current.draft}
                      index={current.index}
                      rules={statement.rules}
                      blocks={fitchEditorChoices(current.draft).blockChoices}
                      pending={pending}
                      onChange={changeEntry}
                      onConfirm={confirmEntry}
                      onDiscard={discardEntry}
                    />
                  ) : undefined
                }
              />
              {selected ? (
                <>
                  <FitchProofLine
                    key={selected.id}
                    statement={statement}
                    purpose={purpose}
                    proof={proof}
                    index={selectedIndex}
                    blocks={blockChoices}
                    onChange={(next) =>
                      change({
                        ...proof,
                        steps: proof.steps.map((step) => (step.id === selected.id ? next : step)),
                      })
                    }
                    onMove={(delta) => change(moveFitchProofStep(proof, selectedIndex, delta))}
                    onDelete={() => setDeletion({ kind: 'line', index: selectedIndex })}
                  />
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setSelectedId(null);
                      focusRequested.current = true;
                    }}
                  >
                    Done editing
                  </button>
                </>
              ) : (
                <>
                  <fieldset disabled={pending} className="fitch-entry-options">
                    <ProofChoice
                      label="New line scope"
                      value={scope}
                      choices={blockChoices}
                      empty="Root proof"
                      onChange={setScope}
                    />
                    <ProofChoice
                      label="Insert before"
                      value={before}
                      choices={lines}
                      empty="Append at end"
                      onChange={setBefore}
                    />
                    <button
                      type="button"
                      className="secondary"
                      disabled={
                        proof.steps.length >= PROOF_LIMITS.maxSteps ||
                        proof.blocks.length >= PROOF_LIMITS.maxBlocks ||
                        (fitchProofDepth(proof, scope) ?? PROOF_LIMITS.maxBlockDepth) >=
                          PROOF_LIMITS.maxBlockDepth
                      }
                      onClick={openSubproof}
                    >
                      Open subproof
                    </button>
                  </fieldset>
                  {!current && (
                    <p role="status">
                      {proof.steps.length >= PROOF_LIMITS.maxSteps
                        ? 'Proof line limit reached. Edit or remove an existing line.'
                        : 'Choose an available scope and insertion position to add a line.'}
                    </p>
                  )}
                  {entryStep?.kind === 'inference' && (
                    <ProofRuleHelp
                      format="fitch"
                      rules={statement.rules}
                      ruleId={entryStep.ruleId}
                    />
                  )}
                </>
              )}
              <fieldset disabled={pending} aria-label="Subproof settings">
                {proof.blocks.map((block, index) => (
                  <FitchProofBlockControls
                    key={block.id}
                    block={block}
                    label={blockChoices[index]!.label}
                    parentChoices={blockChoices.filter(
                      (value) => !fitchProofSubtree(proof, block.id).has(value.id),
                    )}
                    finalLineChoices={lines.filter((line) => lineScopes.get(line.id) === block.id)}
                    onChange={(next) =>
                      change({
                        ...proof,
                        blocks: proof.blocks.map((value) => (value.id === block.id ? next : value)),
                      })
                    }
                    onDelete={() => setDeletion({ kind: 'block', id: block.id })}
                  />
                ))}
              </fieldset>
            </>
          )}
          <span className="proof-control-label" aria-live="polite">
            {announcement}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={() => setDeletion({ kind: 'proof' })}
          >
            {reference ? 'Remove reference proof' : 'Clear proof'}
          </button>
          {deletion && (
            <FitchProofDeletionConfirmation
              reference={reference}
              kind={deletion.kind}
              deletedCount={deletedCount}
              onConfirm={() => {
                if (deletion.kind === 'proof') {
                  setScope(null);
                  setBefore(null);
                  setSelectedId(null);
                  change(null);
                } else if (deletion.kind === 'line')
                  change(removeFitchProofStep(proof, deletion.index));
                else {
                  if (affected && scope && affected.has(scope)) setScope(null);
                  change(removeFitchSubproof(proof, deletion.id));
                }
              }}
              onCancel={() => setDeletion(null)}
            />
          )}
        </>
      )}
    </section>
  );
}
