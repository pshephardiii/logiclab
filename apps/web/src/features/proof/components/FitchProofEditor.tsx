import { FitchRangeDeletionDialog } from './FitchRangeDeletionDialog';
import { FitchProofDeletionConfirmation } from './FitchProofDeletionConfirmation';
import { fitchEditorChoices } from '../helpers/proof-editor-choices';
import { FitchSubproofDialog } from './FitchSubproofDialog';
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
import { resumedFitchScope, fitchScopeEndpoint } from '../helpers/fitch-entry-scope';
import type { ReactNode } from 'react';
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
  actions?: ReactNode;
  conclusionActions?: ReactNode;
};

type Deletion =
  | { kind: 'line'; id: string }
  | { kind: 'block'; id: string }
  | { kind: 'proof' }
  | { kind: 'range'; from: string; to: string; base: FitchProof };

export function FitchProofEditor({
  statement,
  proof,
  purpose,
  onChange,
  onPendingChange,
  actions,
  conclusionActions,
}: Props) {
  const reference = purpose === 'reference';
  const heading = reference ? 'Reference proof' : 'Your proof';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [recentlyClosed, setRecentlyClosed] = useState<{ id: string; proof: FitchProof } | null>(
    null,
  );
  const [scope, setScope] = useState<string | null>(() => resumedFitchScope(proof));
  const [before, setBefore] = useState<string | null>(null);
  const [entry, setEntry] = useState<FitchEntry | null>(null);
  const [deletion, setDeletion] = useState<Deletion | null>(null);
  const [rangeStart, setRangeStart] = useState<{ id: string; base: FitchProof } | null>(null);
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

  useEffect(() => {
    if (!rangeStart || deletion) return;
    editor.current
      ?.querySelector<HTMLButtonElement>('button[data-proof-range][aria-pressed="true"]')
      ?.focus();
  }, [rangeStart, deletion]);

  function change(next: FitchProof | null) {
    setDeletion(null);
    setRangeStart(null);
    setRecentlyClosed(null);
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

  function selectRange(id: string) {
    if (!proof || pending || !safe) return;
    if (rangeStart && rangeStart.base !== proof) {
      setError('The proof changed. Cancel the selection and choose the lines again.');
      return;
    }
    setSelectedId(null);
    setSettingsId(null);
    setBefore(null);
    if (rangeStart) setDeletion({ kind: 'range', from: rangeStart.id, to: id, base: proof });
    else {
      setRangeStart({ id, base: proof });
      setDeletion(null);
      setError(null);
    }
  }

  function cancelRange() {
    setRangeStart(null);
    setDeletion(null);
    setError(null);
  }

  function closeBlock(id: string, endId: string) {
    if (!proof || pending) return;
    const block = proof.blocks.find((block) => block.id === id);
    if (!block) return;
    const next = {
      ...proof,
      blocks: proof.blocks.map((value) => (value.id === id ? { ...value, endId } : value)),
    };
    change(next);
    setRecentlyClosed({ id, proof: next });
    setScope(block.parentId);
    setSelectedId(null);
    setBefore(null);
    focusRequested.current = true;
    setAnnouncement('Subproof closed. Continue in the parent proof.');
  }

  function reopenBlock(id: string) {
    if (!proof || pending || !safe) return;
    const block = proof.blocks.find((value) => value.id === id);
    if (!block || block.endId === null) return;
    change({
      ...proof,
      blocks: proof.blocks.map((value) => (value.id === id ? { ...value, endId: null } : value)),
    });
    setScope(id);
    setSelectedId(null);
    setBefore(null);
    focusRequested.current = true;
    setAnnouncement('Subproof reopened. Continue inside it.');
  }

  const reopenCandidate =
    recentlyClosed?.proof === proof
      ? proof?.blocks.find(
          (block) =>
            block.id === recentlyClosed.id && block.endId !== null && block.parentId === scope,
        )
      : undefined;

  const activeBlock = proof?.blocks.find((block) => block.id === scope);
  const endpoint = proof ? fitchScopeEndpoint(proof, scope, before) : null;

  const { lines, lineScopes, blockChoices } = fitchEditorChoices(
    proof ?? { proofVersion: 1, format: 'fitch', steps: [], blocks: [] },
  );
  // Malformed drafts may contain blocks with no usable assumption-line menu.
  const attachedBlockIds = new Set(
    proof?.steps
      .filter((step) => step.kind === 'assumption')
      .map((step) => proof.blocks.find((block) => block.assumptionId === step.id)?.id),
  );
  const unattachedBlockChoices = blockChoices.filter((block) => !attachedBlockIds.has(block.id));
  const settingsBlock = proof?.blocks.find((block) => block.id === settingsId);
  const settingsIndex = proof?.blocks.findIndex((block) => block.id === settingsId) ?? -1;
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
      className="proof-editor fitch-editor"
      aria-label={reference ? 'Reference proof editor' : 'Student proof editor'}
    >
      <ProofEditorHeading
        title={heading}
        goal={statement.conclusion}
        goalActions={conclusionActions}
      />
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
        <div className="fitch-proof-actions">
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
          {actions}
        </div>
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
              {rangeStart ? (
                <div className="fitch-range-instructions">
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
              <FitchProofDisplay
                proof={proof}
                rules={statement.rules}
                selectedId={selected?.id ?? null}
                disabled={pending || rangeStart !== null}
                onRangeSelect={selectRange}
                rangeDisabled={pending}
                rangeStartId={rangeStart?.id}
                rangeEndId={deletion?.kind === 'range' ? deletion.to : undefined}
                onEdit={(id) => {
                  if (selectedId === id)
                    editor.current
                      ?.querySelector<HTMLInputElement>('input[data-proof-formula]')
                      ?.focus();
                  setSelectedId(id);
                  setDeletion(null);
                  focusRequested.current = true;
                }}
                onMove={(index, delta) => change(moveFitchProofStep(proof, index, delta))}
                onInsert={
                  proof.steps.length < PROOF_LIMITS.maxSteps
                    ? (id) => {
                        const step = proof.steps.find((step) => step.id === id)!;
                        const block = proof.blocks.find((block) => block.id === step.blockId);
                        setSelectedId(null);
                        setBefore(id);
                        setScope(
                          step.kind === 'assumption' ? (block?.parentId ?? null) : step.blockId,
                        );
                        setDeletion(null);
                        setError(null);
                        focusRequested.current = true;
                      }
                    : undefined
                }
                onDelete={(id) => setDeletion({ kind: 'line', id })}
                onBlockSettings={setSettingsId}
                onDeleteBlock={(id) => setDeletion({ kind: 'block', id })}
                onCloseBlock={closeBlock}
                onContinueBlock={(id) => {
                  setScope(id);
                  setSelectedId(null);
                  setBefore(null);
                  focusRequested.current = true;
                }}
                renderLine={(step, index, lineActions, lineNumber) =>
                  step.id === selected?.id && (
                    <FitchProofEntry
                      key={step.id}
                      proof={proof}
                      index={index}
                      rules={statement.rules}
                      premises={statement.premises}
                      blocks={blockChoices}
                      editing
                      actions={lineActions}
                      lineNumber={lineNumber}
                      pending={false}
                      onChange={(next) =>
                        change({
                          ...proof,
                          steps: proof.steps.map((value) => (value.id === step.id ? next : value)),
                        })
                      }
                      onConfirm={() => {
                        setSelectedId(null);
                        focusRequested.current = true;
                      }}
                      onDiscard={() => {}}
                    />
                  )
                }
                onReopenBlock={reopenBlock}
                entryLabel={pending ? 'Unconfirmed proof entry' : 'New proof line'}
                entry={
                  !selected && !rangeStart && current ? (
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
                  {selected.kind === 'inference' && (
                    <ProofChoice
                      label={`Scope for line ${selectedIndex + 1}`}
                      value={selected.blockId}
                      empty="Main proof"
                      choices={blockChoices}
                      onChange={(blockId) =>
                        change({
                          ...proof,
                          steps: proof.steps.map((step) =>
                            step.id === selected.id && step.kind === 'inference'
                              ? { ...step, blockId }
                              : step,
                          ),
                        })
                      }
                    />
                  )}
                </>
              ) : (
                <>
                  <fieldset
                    disabled={pending || rangeStart !== null}
                    className="fitch-entry-options"
                  >
                    <p
                      className="fitch-current-scope"
                      aria-label="Current proof scope"
                      data-scope-id={scope ?? ''}
                    >
                      {activeBlock
                        ? `Inside subproof starting at line ${proof.steps.findIndex((step) => step.id === activeBlock.assumptionId) + 1 || '?'}`
                        : scope
                          ? 'Unavailable subproof scope'
                          : 'Main proof'}
                    </p>
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
                    <button
                      type="button"
                      className="secondary"
                      disabled={!endpoint}
                      onClick={() =>
                        activeBlock && endpoint && closeBlock(activeBlock.id, endpoint.id)
                      }
                    >
                      Close subproof
                    </button>
                    {reopenCandidate && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => reopenBlock(reopenCandidate.id)}
                      >
                        Reopen subproof
                      </button>
                    )}
                  </fieldset>
                  {before && (
                    <p className="help">
                      Inserting before line{' '}
                      {proof.steps.findIndex((step) => step.id === before) + 1 || '?'}.
                      <button
                        type="button"
                        className="text-button"
                        disabled={pending}
                        onClick={() => setBefore(null)}
                      >
                        Append at end instead
                      </button>
                    </p>
                  )}
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
              {unattachedBlockChoices.length > 0 && (
                <details>
                  <summary>Unattached subproofs</summary>
                  {unattachedBlockChoices.map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      className="text-button"
                      disabled={pending}
                      onClick={() => setSettingsId(block.id)}
                    >
                      Settings for {block.label}
                    </button>
                  ))}
                </details>
              )}
              {settingsBlock && !pending && (
                <FitchSubproofDialog
                  block={settingsBlock}
                  label={blockChoices[settingsIndex]!.label}
                  parentChoices={blockChoices.filter(
                    (value) => !fitchProofSubtree(proof, settingsBlock.id).has(value.id),
                  )}
                  finalLineChoices={lines.filter(
                    (line) => lineScopes.get(line.id) === settingsBlock.id,
                  )}
                  onChange={(next) =>
                    change({
                      ...proof,
                      blocks: proof.blocks.map((block) => (block.id === next.id ? next : block)),
                    })
                  }
                  onDelete={() => {
                    setSettingsId(null);
                    setDeletion({ kind: 'block', id: settingsBlock.id });
                  }}
                  onClose={() => setSettingsId(null)}
                />
              )}
            </>
          )}
          <span className="proof-control-label" aria-live="polite">
            {announcement}
          </span>
          <div className="fitch-proof-actions">
            {(reference || !safe) && (
              <button
                type="button"
                className="secondary"
                disabled={pending || rangeStart !== null}
                onClick={() => setDeletion({ kind: 'proof' })}
              >
                {reference ? 'Remove reference proof' : 'Discard malformed proof'}
              </button>
            )}
            {actions}
          </div>
          {deletion?.kind === 'range' ? (
            <FitchRangeDeletionDialog
              proof={deletion.base}
              currentProof={proof}
              from={deletion.from}
              to={deletion.to}
              onCancel={cancelRange}
              onConfirm={(next) => {
                if (next.blocks.every((block) => block.id !== scope))
                  setScope(resumedFitchScope(next));
                setBefore(null);
                setSelectedId(null);
                change(next);
                focusRequested.current = true;
                setAnnouncement('Selected lines deleted. Remaining lines have been renumbered.');
              }}
            />
          ) : (
            deletion && (
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
                  } else if (deletion.kind === 'line') {
                    if (before === deletion.id) setBefore(null);
                    change(
                      removeFitchProofStep(
                        proof,
                        proof.steps.findIndex((step) => step.id === deletion.id),
                      ),
                    );
                  } else {
                    if (affected && scope && affected.has(scope)) setScope(null);
                    change(removeFitchSubproof(proof, deletion.id));
                  }
                }}
                onCancel={() => setDeletion(null)}
              />
            )
          )}
        </>
      )}
    </section>
  );
}
