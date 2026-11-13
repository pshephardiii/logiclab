import { createNaturalDeductionTreeEntry, type NaturalDeductionTreeEntry } from './entry';
import { NaturalDeductionTreeProofEntry } from './NaturalDeductionTreeProofEntry';
import { ProofDeletionPrompt } from '../components/ProofDeletionPrompt';
import { useEffect, useRef, useState } from 'react';
import {
  PROOF_LIMITS,
  type NaturalDeductionTreeProof,
  type NaturalDeductionTreeProofNode,
} from '@logiclab/contracts';
import { NaturalDeductionTreeNodeActions } from './NaturalDeductionTreeNodeActions';
import {
  createConnectedNaturalDeductionTreeEntry,
  confirmNaturalDeductionTreeEntry,
  naturalDeductionTreeConnectionSlots,
} from './connections';
import { NaturalDeductionTreeProofNodeFields } from './NaturalDeductionTreeProofNodeFields';
import { NaturalDeductionTreeProofPreview } from './NaturalDeductionTreeProofPreview';
import { NaturalDeductionTreeProofSummary } from './NaturalDeductionTreeProofSummary';
import {
  startNaturalDeductionTreeProof,
  removeNaturalDeductionTreeNode,
  uniqueNaturalDeductionTreeIds,
} from './editor';
import '../proof.css';
import { ProofHelp } from '../reference/ProofHelp';
import { ProofEditorHeading } from '../components/ProofEditorHeading';

export function NaturalDeductionTreeProofEditor({
  statement,
  proof,
  onChange,
  purpose = 'reference',
  onPendingChange,
}: {
  statement: {
    conclusion: string;
    premises: { id: string; formula: string }[];
    rules: { id: string; label: string }[];
  };
  proof: NaturalDeductionTreeProof | null;
  purpose?: 'reference' | 'student';
  onChange: (proof: NaturalDeductionTreeProof | null) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const reference = purpose === 'reference';
  const [entry, setEntry] = useState<NaturalDeductionTreeEntry | null>(null);
  const pending = entry !== null;

  useEffect(() => {
    onPendingChange?.(pending);
    return () => onPendingChange?.(false);
  }, [pending, onPendingChange]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fields = useRef<HTMLDivElement>(null);
  const focusRequested = useRef(false);
  const position = proof?.nodes.findIndex((node) => node.id === selectedId) ?? -1;
  const rootPosition = proof?.nodes.findIndex((node) => node.id === proof.rootId) ?? -1;
  const selectedIndex = position >= 0 ? position : rootPosition >= 0 ? rootPosition : 0;
  const selected = proof?.nodes[selectedIndex];

  useEffect(() => {
    if (!focusRequested.current) return;
    fields.current?.querySelector<HTMLInputElement>('input[data-proof-formula]')?.focus();
    focusRequested.current = false;
  });

  const [deletion, setDeletion] = useState<{ id: string } | { all: true } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function change(next: NaturalDeductionTreeProof | null) {
    setDeletion(null);
    setError(null);
    onChange(next);
  }

  function add(kind: NaturalDeductionTreeProofNode['kind']) {
    if (!proof || pending) return;

    try {
      setEntry(createNaturalDeductionTreeEntry(proof, kind));
      setDeletion(null);
      setError(null);
      focusRequested.current = true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add a proof node.');
    }
  }

  function discardEntry() {
    setEntry(null);
    setError(null);
    focusRequested.current = true;
  }

  function confirmEntry() {
    if (!entry) return;
    if (proof !== entry.base) {
      setError('The proof changed while this entry was open. Discard entry and try again.');
      return;
    }

    setSelectedId(entry.draft.nodes[entry.index]!.id);
    try {
      change(confirmNaturalDeductionTreeEntry(entry));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not connect this node.');
      return;
    }
    setEntry(null);
    focusRequested.current = true;
  }

  return (
    <section
      className="proof-editor"
      aria-label={
        reference
          ? 'Natural-deduction tree reference proof editor'
          : 'Natural-deduction tree student proof editor'
      }
    >
      <ProofEditorHeading
        title={reference ? 'Reference proof' : 'Your proof'}
        goal={statement.conclusion}
      />
      {statement.premises.length > 0 && (
        <p className="help">
          Available premises: {statement.premises.map((premise) => premise.formula).join('; ')}
        </p>
      )}
      <ProofHelp format="tree" rules={statement.rules} />
      <p className="help">Build from the conclusion toward its premises.</p>
      {pending && (!proof || !uniqueNaturalDeductionTreeIds(proof)) && (
        <p role="alert" className="error">
          The proof changed while this entry was open. Discard entry and try again.
          <button type="button" className="text-button" onClick={discardEntry}>
            Discard entry
          </button>
        </p>
      )}
      {!proof ? (
        <>
          <p>
            Starting creates an unverified conclusion root from the current target once. Later
            statement edits do not rewrite it.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => change(startNaturalDeductionTreeProof(statement.conclusion))}
          >
            {reference ? 'Start reference proof' : 'Start proof'}
          </button>
        </>
      ) : (
        <>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {!uniqueNaturalDeductionTreeIds(proof) ? (
            <>
              <p role="alert" className="error">
                This tree has duplicate node identities. Editing is disabled; inspect the draft or
                explicitly remove it to start fresh.
              </p>
              <NaturalDeductionTreeProofSummary
                proof={proof}
                rules={statement.rules}
                label="Retained tree draft"
              />
            </>
          ) : (
            <>
              <NaturalDeductionTreeProofPreview
                proof={proof}
                rules={statement.rules}
                selectedId={pending ? null : (selected?.id ?? null)}
                disabled={pending}
                onSelect={(id) => {
                  if (pending) return;
                  if (selectedId === id || selected?.id === id)
                    fields.current
                      ?.querySelector<HTMLInputElement>('input[data-proof-formula]')
                      ?.focus();
                  setSelectedId(id);
                  setDeletion(null);
                  focusRequested.current = true;
                }}
                renderActions={(node, index) => (
                  <NaturalDeductionTreeNodeActions
                    index={index}
                    disabled={pending}
                    root={proof.rootId === node.id}
                    slots={naturalDeductionTreeConnectionSlots(proof, node.id, statement.rules)}
                    onEdit={() => {
                      setSelectedId(node.id);
                      setDeletion(null);
                      focusRequested.current = true;
                    }}
                    onRoot={() => {
                      if (!pending) change({ ...proof, rootId: node.id });
                    }}
                    onDelete={() => {
                      setSelectedId(node.id);
                      setDeletion({ id: node.id });
                    }}
                    onConnect={(kind, connection) => {
                      if (pending) return;
                      try {
                        setEntry(
                          createConnectedNaturalDeductionTreeEntry(
                            proof,
                            node.id,
                            kind,
                            connection,
                            statement.rules,
                          ),
                        );
                        setDeletion(null);
                        setError(null);
                        focusRequested.current = true;
                      } catch (caught) {
                        setError(
                          caught instanceof Error
                            ? caught.message
                            : 'Could not start a connection.',
                        );
                      }
                    }}
                  />
                )}
              />
              <fieldset disabled={pending} aria-label="Natural-deduction tree structure">
                <div className="action-row">
                  {(['premise', 'assumption', 'inference'] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      disabled={proof.nodes.length >= PROOF_LIMITS.maxSteps}
                      onClick={() => add(kind)}
                    >
                      New {kind} node
                    </button>
                  ))}
                </div>
              </fieldset>
              <div ref={fields}>
                {entry ? (
                  <NaturalDeductionTreeProofEntry
                    key={entry.draft.nodes[entry.index]!.id}
                    proof={entry.draft}
                    index={entry.index}
                    statement={statement}
                    onChange={(next) =>
                      setEntry({
                        ...entry,
                        draft: {
                          ...entry.draft,
                          nodes: entry.draft.nodes.map((node, index) =>
                            index === entry.index ? next : node,
                          ),
                        },
                      })
                    }
                    connection={entry.connection}
                    onConnectionChange={(connection) => setEntry({ ...entry, connection })}
                    onConfirm={confirmEntry}
                    onDiscard={discardEntry}
                  />
                ) : (
                  selected && (
                    <NaturalDeductionTreeProofNodeFields
                      key={selected.id}
                      proof={proof}
                      index={selectedIndex}
                      statement={statement}
                      onChange={(next) =>
                        change({
                          ...proof,
                          nodes: proof.nodes.map((node) => (node.id === selected.id ? next : node)),
                        })
                      }
                    />
                  )
                )}
              </div>
            </>
          )}
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={() => setDeletion({ all: true })}
          >
            {reference ? 'Remove reference proof' : 'Clear proof'}
          </button>
          {deletion && (
            <ProofDeletionPrompt
              modal={!('all' in deletion)}
              label="Confirm tree deletion"
              onCancel={() => setDeletion(null)}
            >
              <p>
                {'all' in deletion
                  ? reference
                    ? 'Remove the entire reference proof?'
                    : 'Clear the entire proof?'
                  : 'Delete this node? Incoming references, assumption selections and the root will remain unresolved until you repair them.'}
              </p>
              <button
                type="button"
                className="danger"
                onClick={() =>
                  change(
                    'all' in deletion ? null : removeNaturalDeductionTreeNode(proof, deletion.id),
                  )
                }
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
