import type { TreeProof } from '@logiclab/contracts';
import type { ReactNode } from 'react';
import { treePreviewLayout } from './editor';
import './tree-proof.css';

/** Drawing entered formulas never checks correctness or grants feedback/reference access. */
export function TreeProofPreview({
  proof,
  rules,
}: {
  proof: TreeProof;
  rules: { id: string; label: string }[];
}) {
  const layout = treePreviewLayout(proof);
  const rendered = new Map<string, ReactNode>();
  const labels = new Map(rules.map((rule) => [rule.id, rule.label]));
  const positions = new Map(proof.nodes.map((node, index) => [node.id, index + 1]));
  for (const index of layout?.order ?? []) {
    const node = proof.nodes[index]!;
    const child = (id: string | null) =>
      id && rendered.has(id) ? (
        rendered.get(id)
      ) : (
        <span className="tree-placeholder">Unselected or missing node</span>
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
                    Assuming {branch.assumptionFormula || '(blank)'}; discharge{' '}
                    {branch.assumptionIds.map((id) => positions.get(id) ?? '?').join(', ') ||
                      'none'}
                  </small>
                </div>
              ))}
            </div>
          )}
        <div className={node.kind === 'inference' ? 'tree-conclusion' : undefined}>
          <code>
            {node.kind === 'assumption'
              ? `[${node.formula || '(blank)'}]`
              : node.formula || '(blank)'}
          </code>
          <small>
            Node {index + 1} ·{' '}
            {node.kind === 'inference'
              ? node.ruleId
                ? (labels.get(node.ruleId) ?? 'Rule not enabled')
                : 'No rule selected'
              : node.kind}
          </small>
        </div>
      </div>,
    );
  }
  return (
    <section aria-label="Tree preview">
      <h4>Tree preview</h4>
      <p className="help">
        Supporting formulas appear above their conclusion. This displays your entries; use Check
        current proof to verify them.
      </p>
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
    </section>
  );
}
