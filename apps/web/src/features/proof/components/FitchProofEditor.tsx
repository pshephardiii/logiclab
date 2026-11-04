import { FitchProofInsertControls } from './FitchProofInsertControls';
import { FitchProofDeletionConfirmation } from './FitchProofDeletionConfirmation';
import { proofEditorChoices } from '../helpers/proof-editor-choices';
import { FitchProofBlockControls } from './FitchProofBlockControls';
import { useState } from 'react';
import type { FitchProof } from '@logiclab/contracts';
import type { DerivationContent } from '@logiclab/contracts/derivation';
import {
  startProof,
  insertProofPremise,
  insertProofStep,
  moveProofStep,
  removeProofStep,
  removeProofSubproof,
  proofSubtree,
  uniqueProofIds,
} from '../helpers/fitch-editor';
import { FitchProofLine } from './FitchProofLine';
import { FitchProofSummary } from './FitchProofSummary';
import '../proof.css';

type Props = {
  statement: Pick<DerivationContent, 'premises' | 'rules'>;
  proof: FitchProof | null;
  purpose: 'reference' | 'student';
  onChange: (proof: FitchProof | null) => void;
};
type Deletion = { kind: 'line'; index: number } | { kind: 'block'; id: string } | { kind: 'proof' };

export function FitchProofEditor({ statement, proof, purpose, onChange }: Props) {
  const reference = purpose === 'reference';
  const heading = reference ? 'Reference proof' : 'Your proof';
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
        <h3>{heading}</h3>
        <p>
          {reference ? 'No reference proof yet.' : 'No proof started yet.'} Starting copies the
          current premises into root lines once; later statement edits do not rewrite them.
        </p>
        <button
          type="button"
          onClick={() => {
            setScope(null);
            setBefore(null);
            change(startProof(statement));
          }}
        >
          {reference ? 'Start reference proof' : 'Start proof'}
        </button>
      </section>
    );
  const safe = uniqueProofIds(proof);
  const { lines, lineScopes, blockChoices } = proofEditorChoices(proof);
  const affected = deletion?.kind === 'block' ? proofSubtree(proof, deletion.id) : null;
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
        ? insertProofPremise(proof!, index)
        : insertProofStep(proof!, index, scope, subproof);
      if (subproof) setScope(next.blocks.at(-1)!.id);
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
      <h3>{heading}</h3>
      <p className="help">
        Line numbers are display positions; citations keep their identity through moves. Moving a
        line does not move a whole subproof. Set each block’s parent and final direct line
        explicitly. Scope/order errors can be saved and checked while you work.
      </p>
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
          {proof.steps.map((step, index) => (
            <FitchProofLine
              key={step.id}
              statement={statement}
              purpose={purpose}
              proof={proof}
              index={index}
              blocks={blockChoices}
              onChange={(next) =>
                change({
                  ...proof,
                  steps: proof.steps.map((value, position) => (position === index ? next : value)),
                })
              }
              onMove={(delta) => change(moveProofStep(proof, index, delta))}
              onDelete={() => setDeletion({ kind: 'line', index })}
            />
          ))}
          {proof.blocks.map((block, index) => (
            <FitchProofBlockControls
              key={block.id}
              block={block}
              label={blockChoices[index]!.label}
              parentChoices={blockChoices.filter(
                (value) => !proofSubtree(proof, block.id).has(value.id),
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
            } else if (deletion.kind === 'line') change(removeProofStep(proof, deletion.index));
            else change(removeProofSubproof(proof, deletion.id));
          }}
          onCancel={() => setDeletion(null)}
        />
      )}
    </section>
  );
}
