import { useState } from 'react';
import { PROOF_LIMITS, type TreeProof, type TreeProofNode } from '@logiclab/contracts';
import { ProofChoice } from '../components/ProofChoice';
import { TreeProofNodeFields } from './TreeProofNodeFields';
import { TreeProofPreview } from './TreeProofPreview';
import { TreeProofSummary } from './TreeProofSummary';
import {
  startTreeProof,
  appendTreeNode,
  removeTreeNode,
  uniqueTreeIds,
  treeNodeChoices,
} from './editor';
import '../proof.css';

export function TreeProofEditor({
  statement,
  proof,
  onChange,
}: {
  statement: {
    conclusion: string;
    premises: { id: string; formula: string }[];
    rules: { id: string; label: string }[];
  };
  proof: TreeProof | null;
  onChange: (proof: TreeProof | null) => void;
}) {
  const [deletion, setDeletion] = useState<{ id: string } | { all: true } | null>(null);
  const [error, setError] = useState<string | null>(null);
  function change(next: TreeProof | null) {
    setDeletion(null);
    setError(null);
    onChange(next);
  }
  function add(kind: TreeProofNode['kind']) {
    if (!proof) return;
    try {
      change(appendTreeNode(proof, kind));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add a proof node.');
    }
  }
  return (
    <section className="proof-editor" aria-label="Tree reference proof editor">
      <h3>Reference proof</h3>
      <p className="help">
        Build from the conclusion toward its supporting premises or assumptions. Add a separate leaf
        for every use; nodes cannot be shared. Choose ordinary supporting nodes and discharged
        branches under each inference. Node numbers label entries, not proof order.
      </p>
      {!proof ? (
        <>
          <p>
            Starting creates an unverified conclusion root from the current target once. Later
            statement edits do not rewrite it.
          </p>
          <button type="button" onClick={() => change(startTreeProof(statement.conclusion))}>
            Start reference proof
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
              <TreeProofPreview proof={proof} rules={statement.rules} />
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
                    Add {kind} node
                  </button>
                ))}
              </div>
              {proof.nodes.map((node, index) => (
                <TreeProofNodeFields
                  key={node.id}
                  proof={proof}
                  index={index}
                  statement={statement}
                  onChange={(next) =>
                    change({
                      ...proof,
                      nodes: proof.nodes.map((value) => (value.id === node.id ? next : value)),
                    })
                  }
                  onDelete={() => setDeletion({ id: node.id })}
                />
              ))}
            </>
          )}
          <button type="button" className="secondary" onClick={() => setDeletion({ all: true })}>
            Remove reference proof
          </button>
          {deletion && (
            <div role="group" aria-label="Confirm tree deletion">
              <p>
                {'all' in deletion
                  ? 'Remove the entire reference proof?'
                  : 'Delete this node? Incoming references, assumption selections and the root will remain unresolved until you repair them.'}
              </p>
              <button
                type="button"
                onClick={() =>
                  change('all' in deletion ? null : removeTreeNode(proof, deletion.id))
                }
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
