import { useState } from 'react';
import type { FitchProof } from '@logiclab/contracts';
import { PROOF_LIMITS } from '@logiclab/contracts';
import type { DerivationDefinition } from '@logiclab/contracts/derivation';
import {
  startReference,
  insertReferencePremise,
  insertReferenceStep,
  moveReferenceStep,
  removeReferenceStep,
  removeReferenceSubproof,
  referenceSubtree,
  uniqueReferenceIds,
  referenceDepth,
} from '../helpers/reference-editor';
import { ReferenceChoice } from './ReferenceChoice';
import { ReferenceProofLine } from './ReferenceProofLine';
import { DerivationReferenceSummary } from './DerivationReferenceSummary';

type Props = { definition: DerivationDefinition; onChange: (proof: FitchProof | null) => void };
type Deletion =
  { kind: 'line'; index: number } | { kind: 'block'; id: string } | { kind: 'reference' };

export function ReferenceProofEditor({ definition, onChange }: Props) {
  const proof = definition.referenceProof;
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
      <section aria-label="Reference proof editor">
        <h3>Reference proof</h3>
        <p>
          No reference proof yet. Starting copies the current premises into root lines once; later
          statement edits do not rewrite them.
        </p>
        <button
          type="button"
          onClick={() => {
            setScope(null);
            setBefore(null);
            change(startReference(definition));
          }}
        >
          Start reference proof
        </button>
      </section>
    );
  const safe = uniqueReferenceIds(proof);
  const lines = proof.steps.map((line, index) => ({
    id: line.id,
    label: `${index + 1}. ${line.formula || '(blank)'}`,
  }));
  const lineScopes = new Map(proof.steps.map((step) => [step.id, step.blockId]));
  const blockChoices = proof.blocks.map((block, index) => ({
    id: block.id,
    label: `Subproof ${index + 1} at line ${proof.steps.findIndex((step) => step.id === block.assumptionId) + 1 || '?'}`,
  }));
  const affected = deletion?.kind === 'block' ? referenceSubtree(proof, deletion.id) : null;
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
        ? insertReferencePremise(proof!, index)
        : insertReferenceStep(proof!, index, scope, subproof);
      if (subproof) setScope(next.blocks.at(-1)!.id);
      change(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not insert a reference line.');
    }
  }
  return (
    <section aria-label="Reference proof editor">
      <h3>Reference proof</h3>
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
            This reference has duplicate or colliding identities. Inspect it below or remove it
            explicitly to start fresh; structural editing is disabled.
          </p>
          <DerivationReferenceSummary definition={definition} />
        </>
      ) : (
        <>
          <ReferenceChoice
            label="New line scope"
            value={scope}
            choices={blockChoices}
            empty="Root proof"
            onChange={(id) => {
              setDeletion(null);
              setScope(id);
            }}
          />
          <ReferenceChoice
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
                (referenceDepth(proof, scope) ?? PROOF_LIMITS.maxBlockDepth) >=
                  PROOF_LIMITS.maxBlockDepth
              }
              onClick={() => insert(true)}
            >
              Open subproof
            </button>
          </div>
          {proof.steps.map((step, index) => (
            <ReferenceProofLine
              key={step.id}
              definition={definition}
              proof={proof}
              index={index}
              blocks={blockChoices}
              onChange={(next) =>
                change({
                  ...proof,
                  steps: proof.steps.map((value, position) => (position === index ? next : value)),
                })
              }
              onMove={(delta) => change(moveReferenceStep(proof, index, delta))}
              onDelete={() => setDeletion({ kind: 'line', index })}
            />
          ))}
          {proof.blocks.map((block) => (
            <section
              key={block.id}
              className="problem-option"
              aria-label={blockChoices.find((value) => value.id === block.id)!.label}
            >
              <h4>{blockChoices.find((value) => value.id === block.id)!.label}</h4>
              <ReferenceChoice
                label={`Parent of ${blockChoices.find((value) => value.id === block.id)!.label}`}
                value={block.parentId}
                empty="Root proof"
                choices={blockChoices.filter(
                  (value) => !referenceSubtree(proof, block.id).has(value.id),
                )}
                onChange={(parentId) =>
                  change({
                    ...proof,
                    blocks: proof.blocks.map((value) =>
                      value.id === block.id ? { ...value, parentId } : value,
                    ),
                  })
                }
              />
              <ReferenceChoice
                label={`Final line of ${blockChoices.find((value) => value.id === block.id)!.label}`}
                value={block.endId}
                empty="Open / unfinished"
                choices={lines.filter((line) => lineScopes.get(line.id) === block.id)}
                onChange={(endId) =>
                  change({
                    ...proof,
                    blocks: proof.blocks.map((value) =>
                      value.id === block.id ? { ...value, endId } : value,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="secondary"
                onClick={() => setDeletion({ kind: 'block', id: block.id })}
              >
                Delete {blockChoices.find((value) => value.id === block.id)!.label}
              </button>
            </section>
          ))}
        </>
      )}
      <button
        type="button"
        className="secondary"
        onClick={() => setDeletion({ kind: 'reference' })}
      >
        Remove reference proof
      </button>
      {deletion && (
        <div role="group" aria-label="Confirm reference deletion">
          <p>
            Delete {deletedCount} reference line(s)
            {affected
              ? ' and this subproof with its nested blocks'
              : deletion.kind === 'reference'
                ? ' and all subproofs'
                : ''}
            ? Surviving citations will remain missing until you repair them. This changes the local
            draft; save explicitly to persist.
          </p>
          <button
            type="button"
            onClick={() => {
              if (deletion.kind === 'reference') {
                setScope(null);
                setBefore(null);
                change(null);
              } else if (deletion.kind === 'line')
                change(removeReferenceStep(proof, deletion.index));
              else change(removeReferenceSubproof(proof, deletion.id));
            }}
          >
            Confirm deletion
          </button>
          <button type="button" className="secondary" onClick={() => setDeletion(null)}>
            Keep reference work
          </button>
        </div>
      )}
    </section>
  );
}
