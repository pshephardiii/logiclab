import { FitchProofInsertControls } from './FitchProofInsertControls';
import { FitchProofDeletionConfirmation } from './FitchProofDeletionConfirmation';
import { fitchEditorChoices } from '../helpers/proof-editor-choices';
import { FitchProofBlockControls } from './FitchProofBlockControls';
import { useEffect, useRef, useState } from 'react';
import { FitchProofDisplay } from './FitchProofDisplay';
import type { FitchProof } from '@logiclab/contracts';
import type { FitchDerivationContent } from '@logiclab/contracts/derivation';
import {
  startFitchProof,
  insertFitchPremise,
  insertFitchProofStep,
  moveFitchProofStep,
  removeFitchProofStep,
  removeFitchSubproof,
  fitchProofSubtree,
  uniqueFitchProofIds,
} from '../helpers/fitch-editor';
import { FitchProofLine } from './FitchProofLine';
import { FitchProofSummary } from './FitchProofSummary';
import '../proof.css';
import { ProofHelp } from '../reference/ProofHelp';
import { ProofEditorHeading } from './ProofEditorHeading';

type Props = {
  statement: Pick<FitchDerivationContent, 'premises' | 'rules'> & { conclusion?: string };
  proof: FitchProof | null;
  purpose: 'reference' | 'student';
  onChange: (proof: FitchProof | null) => void;
};

type Deletion = { kind: 'line'; index: number } | { kind: 'block'; id: string } | { kind: 'proof' };

export function FitchProofEditor({ statement, proof, purpose, onChange }: Props) {
  const reference = purpose === 'reference';
  const heading = reference ? 'Reference proof' : 'Your proof';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const editPanel = useRef<HTMLDivElement>(null);
  const focusRequested = useRef(false);
  const selectedPosition = proof?.steps.findIndex((step) => step.id === selectedId) ?? -1;
  const selectedIndex = selectedPosition < 0 ? (proof?.steps.length ?? 0) - 1 : selectedPosition;

  useEffect(() => {
    if (!focusRequested.current) return;
    editPanel.current?.querySelector<HTMLInputElement>('input[data-proof-formula]')?.focus();
    focusRequested.current = false;
  });

  const [scope, setScope] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [deletion, setDeletion] = useState<Deletion | null>(null);
  const [error, setError] = useState<string | null>(null);

  function change(next: FitchProof | null) {
    setDeletion(null);
    setError(null);
    onChange(next);
  }

  if (!proof)
    return (
      <section
        className="proof-editor"
        aria-label={reference ? 'Reference proof editor' : 'Student proof editor'}
      >
        <ProofEditorHeading title={heading} goal={statement.conclusion} />
        <ProofHelp format="fitch" rules={statement.rules} />
        <p>
          {reference ? 'No reference proof yet.' : 'No proof started yet.'} Starting copies the
          current premises into root lines once; later statement edits do not rewrite them.
        </p>
        <button
          type="button"
          onClick={() => {
            setScope(null);
            setBefore(null);
            change(startFitchProof(statement));
          }}
        >
          {reference ? 'Start reference proof' : 'Start proof'}
        </button>
      </section>
    );

  const safe = uniqueFitchProofIds(proof);
  const { lines, lineScopes, blockChoices } = fitchEditorChoices(proof);
  const affected = deletion?.kind === 'block' ? fitchProofSubtree(proof, deletion.id) : null;

  const deletedCount = affected
    ? proof.steps.filter((step) => step.blockId && affected.has(step.blockId)).length
    : deletion?.kind === 'line'
      ? 1
      : proof.steps.length;

  function insert(subproof: boolean, premise = false) {
    try {
      const index =
        before === null
          ? proof!.steps.length
          : proof!.steps.findIndex((step) => step.id === before);

      const next = premise
        ? insertFitchPremise(proof!, index)
        : insertFitchProofStep(proof!, index, scope, subproof);

      if (subproof) setScope(next.blocks.at(-1)!.id);

      setSelectedId(next.steps[index]!.id);
      focusRequested.current = true;
      change(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not insert a proof line.');
    }
  }

  return (
    <section
      className="proof-editor"
      aria-label={reference ? 'Reference proof editor' : 'Student proof editor'}
    >
      <ProofEditorHeading title={heading} goal={statement.conclusion} />
      <ProofHelp format="fitch" rules={statement.rules} />
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
        </>
      ) : (
        <>
          <FitchProofDisplay
            proof={proof}
            rules={statement.rules}
            selectedId={proof.steps[selectedIndex]?.id ?? null}
            onEdit={(id) => {
              if (proof.steps[selectedIndex]?.id === id)
                editPanel.current
                  ?.querySelector<HTMLInputElement>('input[data-proof-formula]')
                  ?.focus();

              setSelectedId(id);
              setDeletion(null);
              focusRequested.current = true;
            }}
          />
          <FitchProofInsertControls
            proof={proof}
            scope={scope}
            before={before}
            lines={lines}
            blockChoices={blockChoices}
            onScopeChange={(id) => {
              setDeletion(null);
              setScope(id);
            }}
            onBeforeChange={(id) => {
              setDeletion(null);
              setBefore(id);
            }}
            onInsert={insert}
          />
          <div ref={editPanel}>
            {proof.steps[selectedIndex] && (
              <FitchProofLine
                key={proof.steps[selectedIndex]!.id}
                statement={statement}
                purpose={purpose}
                proof={proof}
                index={selectedIndex}
                blocks={blockChoices}
                onChange={(next) =>
                  change({
                    ...proof,
                    steps: proof.steps.map((value, position) =>
                      position === selectedIndex ? next : value,
                    ),
                  })
                }
                onMove={(delta) => change(moveFitchProofStep(proof, selectedIndex, delta))}
                onDelete={() => setDeletion({ kind: 'line', index: selectedIndex })}
              />
            )}
          </div>
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
        </>
      )}
      <button type="button" className="secondary" onClick={() => setDeletion({ kind: 'proof' })}>
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
              change(null);
            } else if (deletion.kind === 'line')
              change(removeFitchProofStep(proof, deletion.index));
            else change(removeFitchSubproof(proof, deletion.id));
          }}
          onCancel={() => setDeletion(null)}
        />
      )}
    </section>
  );
}
