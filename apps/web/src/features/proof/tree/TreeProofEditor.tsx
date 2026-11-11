import { createTreeEntry, type TreeEntry } from './entry';
import { TreeProofEntry } from './TreeProofEntry';
import { ProofDeletionPrompt } from '../components/ProofDeletionPrompt';
import { useEffect, useRef, useState } from 'react';
import { PROOF_LIMITS, type TreeProof, type TreeProofNode } from '@logiclab/contracts';
import { ProofChoice } from '../components/ProofChoice';
import { TreeProofNodeFields } from './TreeProofNodeFields';
import { TreeProofPreview } from './TreeProofPreview';
import { TreeProofSummary } from './TreeProofSummary';
import { startTreeProof, removeTreeNode, uniqueTreeIds, treeNodeChoices } from './editor';
import '../proof.css';
import { ProofHelp } from '../reference/ProofHelp';
import { ProofEditorHeading } from '../components/ProofEditorHeading';

export function TreeProofEditor({
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
  proof: TreeProof | null;
  purpose?: 'reference' | 'student';
  onChange: (proof: TreeProof | null) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const reference = purpose === 'reference';
  const [entry, setEntry] = useState<TreeEntry | null>(null);
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

  function change(next: TreeProof | null) {
    setDeletion(null);
    setError(null);
    onChange(next);
  }

  function add(kind: TreeProofNode['kind']) {
    if (!proof || pending) return;

    try {
      setEntry(createTreeEntry(proof, kind));
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
    change(entry.draft);
    setEntry(null);
    focusRequested.current = true;
  }

  return (
    <section
      className="proof-editor"
      aria-label={reference ? 'Tree reference proof editor' : 'Tree student proof editor'}
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
      {pending && (!proof || !uniqueTreeIds(proof)) && (
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
            onClick={() => change(startTreeProof(statement.conclusion))}
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
          {!uniqueTreeIds(proof) ? (
            <>
              <p role="alert" className="error">
                This tree has duplicate node identities. Editing is disabled; inspect the draft or
                explicitly remove it to start fresh.
              </p>
              <TreeProofSummary proof={proof} rules={statement.rules} label="Retained tree draft" />
            </>
          ) : (
            <>
              <TreeProofPreview
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
              />
              <fieldset disabled={pending} aria-label="Tree structure">
                <ProofChoice
                  label="Conclusion root"
                  value={proof.rootId}
                  choices={treeNodeChoices(proof)}
                  onChange={(rootId) => change({ ...proof, rootId })}
                />
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
                  <TreeProofEntry
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
                    onConfirm={confirmEntry}
                    onDiscard={discardEntry}
                  />
                ) : (
                  selected && (
                    <TreeProofNodeFields
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
                      onDelete={() => setDeletion({ id: selected.id })}
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
                  change('all' in deletion ? null : removeTreeNode(proof, deletion.id))
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
