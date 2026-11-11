import { proofNotation } from '../helpers/proof-notation';
import type { TreeProof } from '@logiclab/contracts';
import type { ReactNode } from 'react';
import { treePreviewLayout } from './editor';
import './tree-proof.css';

/** Drawing entered formulas never checks correctness or grants feedback/reference access. */
export function TreeProofPreview({
  proof,
  rules,
  selectedId = null,
  onSelect,
}: {
  proof: TreeProof;
  rules: { id: string; label: string }[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const layout = treePreviewLayout(proof);
  const rendered = new Map<string, ReactNode>();
  const labels = new Map(rules.map((rule) => [rule.id, rule.label]));
  const positions = new Map(proof.nodes.map((node, index) => [node.id, index + 1]));

  const attachedIds = new Set(layout?.order.map((index) => proof.nodes[index]!.id));
  const unattached = proof.nodes.filter((node) => !attachedIds.has(node.id));

  // Child views already exist when their parent is assembled; raw draft links never drive recursion.
  for (const index of layout?.order ?? []) {
    const node = proof.nodes[index]!;

    const child = (id: string | null) =>
      id && rendered.has(id) ? (
        rendered.get(id)
      ) : (
        <span className="tree-placeholder">Unselected or missing node</span>
      );

    const contents = (
      <>
        <code>
          {node.kind === 'assumption'
            ? `[${proofNotation(node.formula) || '(blank)'}]`
            : proofNotation(node.formula) || '(blank)'}
        </code>
        <small>
          Node {index + 1} ·{' '}
          {node.kind === 'inference'
            ? node.ruleId
              ? (labels.get(node.ruleId) ?? 'Rule not enabled')
              : 'No rule selected'
            : node.kind}
        </small>
      </>
    );

    rendered.set(
      node.id,
      <div className="tree-preview-node" key={node.id}>
        {node.kind === 'inference' &&
          (node.lineReferences.length > 0 || node.branches.length > 0) && (
            <div className="tree-supports">
              {node.lineReferences.map((id, slot) => (
                <div key={`line-${slot}`}>{child(id)}</div>
              ))}
              {node.branches.map((branch, slot) => (
                <div key={`branch-${slot}`}>
                  {child(branch.rootId)}
                  <small>
                    Assuming {proofNotation(branch.assumptionFormula) || '(blank)'}; discharge{' '}
                    {branch.assumptionIds.map((id) => positions.get(id) ?? '?').join(', ') ||
                      'none'}
                  </small>
                </div>
              ))}
            </div>
          )}
        <div className={node.kind === 'inference' ? 'tree-conclusion' : undefined}>
          {onSelect ? (
            <button
              type="button"
              className="tree-node-select"
              aria-label={`Edit node ${index + 1}`}
              aria-pressed={selectedId === node.id}
              onClick={() => onSelect(node.id)}
            >
              {contents}
            </button>
          ) : (
            contents
          )}
        </div>
      </div>,
    );
  }

  return (
    <section aria-label="Tree preview">
      {!onSelect && (
        <>
          <h4>Tree preview</h4>
          <p className="help">
            Supporting formulas appear above their conclusion. This displays your entries without
            checking correctness.
          </p>
        </>
      )}
      {!layout ? (
        <p>
          Preview cannot draw shared or cyclic links or duplicate node identities. Repair the node
          fields in the editor; your work is retained.
        </p>
      ) : (
        <>
          {layout.order.length ? (
            <div className="tree-proof-preview">{rendered.get(proof.rootId!)}</div>
          ) : (
            <p>Select an existing conclusion root to draw the tree.</p>
          )}
          {layout.unattached > 0 && (
            <p>
              {layout.unattached} unattached node(s) remain in the draft and will also be checked.
            </p>
          )}
        </>
      )}
      {onSelect && unattached.length > 0 && (
        <section
          className="tree-unattached"
          aria-label={layout ? 'Unattached proof nodes' : 'Retained proof nodes'}
        >
          <h4>{layout ? 'Unattached nodes' : 'Proof nodes'}</h4>
          <div className="tree-unattached-nodes">
            {unattached.map((node) => (
              <button
                type="button"
                key={node.id}
                className="tree-node-select"
                aria-label={`Edit node ${positions.get(node.id)}`}
                aria-pressed={selectedId === node.id}
                onClick={() => onSelect(node.id)}
              >
                <code>{proofNotation(node.formula) || '(blank)'}</code>
                <small>
                  Node {positions.get(node.id)} · {node.kind}
                </small>
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
