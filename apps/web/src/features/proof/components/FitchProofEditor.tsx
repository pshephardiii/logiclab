import { FitchProofBlockControls } from './FitchProofBlockControls';
import { useState } from 'react';
import type { FitchProof } from '@logiclab/contracts';
import { PROOF_LIMITS } from '@logiclab/contracts';
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
  proofDepth,
} from '../helpers/fitch-editor';
import { ProofChoice } from './ProofChoice';
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
        className="fitch-proof"
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
  const lines = proof.steps.map((line, index) => ({
    id: line.id,
    label: `${index + 1}. ${line.formula || '(blank)'}`,
  }));
  const lineScopes = new Map(proof.steps.map((step) => [step.id, step.blockId]));
  const blockChoices = proof.blocks.map((block, index) => ({
    id: block.id,
    label: `Subproof ${index + 1} at line ${proof.steps.findIndex((step) => step.id === block.assumptionId) + 1 || '?'}`,
  }));
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
      className="fitch-proof"
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
          <ProofChoice
            label="New line scope"
            value={scope}
            choices={blockChoices}
            empty="Root proof"
            onChange={(id) => {
              setDeletion(null);
              setScope(id);
            }}
          />
          <ProofChoice
            label="Insert before"
            value={before}
            choices={lines}
            empty="Append at end"
            onChange={(id) => {
              setDeletion(null);
              setBefore(id);
            }}
          />
          <div className="action-row">
            <button
              type="button"
              disabled={proof.steps.length >= PROOF_LIMITS.maxSteps}
              onClick={() => insert(false, true)}
            >
              Add premise line at root
            </button>
            <button
              type="button"
              disabled={proof.steps.length >= PROOF_LIMITS.maxSteps}
              onClick={() => insert(false)}
            >
              Add inference line
            </button>
            <button
              type="button"
              disabled={
                proof.steps.length >= PROOF_LIMITS.maxSteps ||
                proof.blocks.length >= PROOF_LIMITS.maxBlocks ||
                (proofDepth(proof, scope) ?? PROOF_LIMITS.maxBlockDepth) >=
                  PROOF_LIMITS.maxBlockDepth
              }
              onClick={() => insert(true)}
            >
              Open subproof
            </button>
          </div>
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
        <div
          role="group"
          aria-label={reference ? 'Confirm reference deletion' : 'Confirm proof deletion'}
        >
          <p>
            Delete {deletedCount} {reference ? 'reference' : 'proof'} line(s)
            {affected
              ? ' and this subproof with its nested blocks'
              : deletion.kind === 'proof'
                ? ' and all subproofs'
                : ''}
            ? Surviving citations will remain missing until you repair them. This changes the local
            draft; save explicitly to persist.
          </p>
          <button
            type="button"
            onClick={() => {
              if (deletion.kind === 'proof') {
                setScope(null);
                setBefore(null);
                change(null);
              } else if (deletion.kind === 'line') change(removeProofStep(proof, deletion.index));
              else change(removeProofSubproof(proof, deletion.id));
            }}
          >
            Confirm deletion
          </button>
          <button type="button" className="secondary" onClick={() => setDeletion(null)}>
            {reference ? 'Keep reference work' : 'Keep proof work'}
          </button>
        </div>
      )}
    </section>
  );
}
