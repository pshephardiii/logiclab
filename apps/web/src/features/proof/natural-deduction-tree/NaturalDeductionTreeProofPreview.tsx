import { proofNotation } from '../helpers/proof-notation';
import type { NaturalDeductionTreeProof, NaturalDeductionTreeProofNode } from '@logiclab/contracts';
import type { ReactNode } from 'react';
import { naturalDeductionTreePreviewLayout } from './editor';
import './natural-deduction-tree-proof.css';

/** Drawing entered formulas never checks correctness or grants feedback/reference access. */
export function NaturalDeductionTreeProofPreview({
  proof,
  rules,
  label = 'Natural-deduction tree preview',
  selectedId = null,
  onSelect,
  disabled = false,
  renderActions,
}: {
  proof: NaturalDeductionTreeProof;
  label?: string;
  rules: { id: string; label: string }[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  disabled?: boolean;
  renderActions?: (node: NaturalDeductionTreeProofNode, index: number) => ReactNode;
}) {
  const layout = naturalDeductionTreePreviewLayout(proof);
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
        <span className="natural-deduction-tree-placeholder">Unselected or missing node</span>
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
      <div className="natural-deduction-tree-preview-node" key={node.id}>
        {node.kind === 'inference' &&
          (node.lineReferences.length > 0 || node.branches.length > 0) && (
            <div className="natural-deduction-tree-supports">
              {node.lineReferences.map((id, slot) => (
                <div key={`line-${slot}`}>{child(id)}</div>
              ))}
              {node.branches.map((branch, slot) => (
                <div key={`branch-${slot}`}>
                  {child(branch.rootId)}
                  <small>
                    Assuming {proofNotation(branch.assumptionFormula) || '(blank)'}; discharge nodes{' '}
                    {branch.assumptionIds.map((id) => positions.get(id) ?? '?').join(', ') ||
                      'none'}
                  </small>
                </div>
              ))}
            </div>
          )}
        <div
          className={node.kind === 'inference' ? 'natural-deduction-tree-conclusion' : undefined}
        >
          {onSelect ? (
            <div className="natural-deduction-tree-node-card" data-proof-node={node.id}>
              <button
                type="button"
                className="natural-deduction-tree-node-select"
                disabled={disabled}
                aria-label={`Edit node ${index + 1}`}
                aria-pressed={selectedId === node.id}
                onClick={() => onSelect(node.id)}
              >
                {contents}
              </button>
              {renderActions?.(node, index)}
            </div>
          ) : (
            <div className="natural-deduction-tree-node-readonly">{contents}</div>
          )}
        </div>
      </div>,
    );
  }

  return (
    <section aria-label={label}>
      {!layout ? (
        <p>
          The diagram cannot show shared or cyclic links or duplicate node identities.
          {onSelect && ' Repair the node fields in the editor; your work is retained.'}
        </p>
      ) : (
        <>
          {layout.order.length ? (
            <div className="natural-deduction-tree-proof-preview">
              {rendered.get(proof.rootId!)}
            </div>
          ) : (
            <p>Select an existing conclusion root to draw the tree.</p>
          )}
          {layout.unattached > 0 && (
            <p>
              {layout.unattached} node(s) are outside the conclusion tree.
              {onSelect && ' They remain part of your work and will also be checked.'}
            </p>
          )}
        </>
      )}
      {onSelect && unattached.length > 0 && (
        <section
          className="natural-deduction-tree-unattached"
          aria-label={layout ? 'Unattached proof nodes' : 'Retained proof nodes'}
        >
          <h4>{layout ? 'Unattached nodes' : 'Proof nodes'}</h4>
          <div className="natural-deduction-tree-unattached-nodes">
            {unattached.map((node) => (
              <div
                className="natural-deduction-tree-node-card"
                key={node.id}
                data-proof-node={node.id}
              >
                <button
                  type="button"
                  className="natural-deduction-tree-node-select"
                  disabled={disabled}
                  aria-label={`Edit node ${positions.get(node.id)}`}
                  aria-pressed={selectedId === node.id}
                  onClick={() => onSelect(node.id)}
                >
                  <code>{proofNotation(node.formula) || '(blank)'}</code>
                  <small>
                    Node {positions.get(node.id)} · {node.kind}
                  </small>
                </button>
                {renderActions?.(node, positions.get(node.id)! - 1)}
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
